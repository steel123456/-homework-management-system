import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { S3Storage } from 'coze-coding-dev-sdk';
import { z } from 'zod';

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

const gradeSchema = z.object({
  submissionId: z.string().min(1, '提交ID不能为空'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = gradeSchema.parse(body);
    
    const client = getSupabaseClient();
    
    // 获取提交记录
    const { data: submission, error: submissionError } = await client
      .from('submissions')
      .select('*, assignments(*)')
      .eq('id', validatedData.submissionId)
      .single();
    
    if (submissionError || !submission) {
      return NextResponse.json({ error: '未找到提交记录' }, { status: 404 });
    }
    
    // 更新状态为批改中
    await client
      .from('submissions')
      .update({ status: 'grading' })
      .eq('id', validatedData.submissionId);
    
    // 准备LLM客户端
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);
    
    // 构建批改提示词
    const assignment = submission.assignments as any;
    let promptText = `你是一位专业的教师，请批改学生的作业。

作业标题：${assignment?.title || '未知'}
作业要求：${assignment?.requirements || '无特殊要求'}
作业描述：${assignment?.description || '无描述'}

学生提交的内容：${submission.content || '无文字内容'}

请从以下几个方面进行评价：
1. 内容完整性（是否完成了所有要求）
2. 准确性（答案是否正确）
3. 表达清晰度（逻辑是否清晰）
4. 创新性（是否有独特的见解）

请给出详细的反馈和评分（0-100分）。`;

    // 准备消息
    const messages: any[] = [
      {
        role: 'system',
        content: '你是一位经验丰富的教师，擅长批改各类作业，能够给出专业、详细的反馈。',
      },
    ];
    
    // 如果有图片，使用视觉模型
    if (submission.image_key) {
      try {
        const imageUrl = await storage.generatePresignedUrl({
          key: submission.image_key,
          expireTime: 3600,
        });
        
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high',
              },
            },
          ],
        });
      } catch (error) {
        console.error('生成图片URL失败:', error);
        // 如果图片URL生成失败，继续使用文字批改
        messages.push({ role: 'user', content: promptText });
      }
    } else {
      messages.push({ role: 'user', content: promptText });
    }
    
    // 调用LLM进行批改
    let feedback = '';
    const stream = llmClient.stream(messages, {
      model: 'doubao-seed-1-6-vision-250815',
      temperature: 0.7,
    });
    
    for await (const chunk of stream) {
      if (chunk.content) {
        feedback += chunk.content.toString();
      }
    }
    
    // 提取分数（简单从反馈中提取）
    const scoreMatch = feedback.match(/(\d+)分|分数[：:]\s*(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1] || scoreMatch[2]) : 85;
    
    // 更新提交记录
    const { error: updateError } = await client
      .from('submissions')
      .update({
        status: 'graded',
        score: Math.min(100, Math.max(0, score)),
        feedback,
        graded_at: new Date().toISOString(),
      })
      .eq('id', validatedData.submissionId);
    
    if (updateError) {
      console.error('更新提交记录失败:', updateError);
      return NextResponse.json({ error: '更新提交记录失败' }, { status: 500 });
    }
    
    // 获取更新后的提交记录
    const { data: updatedSubmission } = await client
      .from('submissions')
      .select('*')
      .eq('id', validatedData.submissionId)
      .single();
    
    return NextResponse.json({
      message: '批改完成',
      submission: updatedSubmission,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据格式错误', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('AI批改错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
