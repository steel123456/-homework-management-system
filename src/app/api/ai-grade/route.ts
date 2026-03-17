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
      .select('*')
      .eq('id', validatedData.submissionId)
      .single();
    
    if (submissionError || !submission) {
      console.error('获取提交记录失败:', submissionError);
      return NextResponse.json({ error: '未找到提交记录' }, { status: 404 });
    }
    
    // 获取作业信息
    const { data: assignment, error: assignmentError } = await client
      .from('assignments')
      .select('*')
      .eq('id', submission.assignment_id)
      .single();
    
    if (assignmentError || !assignment) {
      console.error('获取作业信息失败:', assignmentError);
      return NextResponse.json({ error: '未找到作业信息' }, { status: 404 });
    }
    
    // 获取学生信息
    const { data: student } = await client
      .from('users')
      .select('name')
      .eq('id', submission.student_id)
      .single();

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
    const promptText = `# 作业批改任务

## 📋 作业信息
**作业标题**：${assignment.title}
**作业描述**：${assignment.description || '无'}
**作业要求**：${assignment.requirements || '无特殊要求'}
${assignment.due_date ? `**截止时间**：${new Date(assignment.due_date).toLocaleString('zh-CN')}` : ''}

## 👨‍🎓 学生信息
**学生姓名**：${student?.name || '未知'}
**提交时间**：${new Date(submission.submitted_at).toLocaleString('zh-CN')}

## 📝 学生答案
${submission.content || '（学生未提交文字内容，可能提交了图片作业）'}

---

# 批改要求

请像一位真实的小学/中学老师那样批改这份作业。你的反馈应该：

1. **批改风格**：
   - 用老师的口吻，温暖而专业
   - 先肯定学生的努力和优点
   - 再指出问题和改进建议
   - 鼓励学生继续努力

2. **评价维度**（总分100分）：
   - **内容完整性**（30分）：是否完成了所有要求的内容
   - **答案准确性**（30分）：答案是否正确
   - **解题过程**（20分）：步骤是否清晰、逻辑是否合理
   - **书写规范**（10分）：格式是否规范、表达是否清晰
   - **创新思维**（10分）：是否有独特的思考角度

3. **反馈格式**（请严格按照以下格式）：

## 🎯 总体评价
[用1-2句话概括学生的整体表现]

## ✅ 优点
- [列出学生做得好的地方，至少2-3点]

## ❌ 问题和建议
- [具体指出问题所在，并给出改进建议]

## 💡 答案解析
[如果答案有误，给出正确答案和解题思路]

## 📊 评分明细
- 内容完整性：XX/30分
- 答案准确性：XX/30分
- 解题过程：XX/20分
- 书写规范：XX/10分
- 创新思维：XX/10分
- **总分：XX/100分**

## 🌟 寄语
[给学生一句鼓励的话]

请确保反馈内容清晰、具体、有针对性，避免空话套话。`;

    // 准备消息
    const messages: any[] = [
      {
        role: 'system',
        content: `你是一位经验丰富、温暖专业的中小学教师。你擅长：
- 发现学生的闪光点
- 用鼓励性的语言指出问题
- 给出具体可行的改进建议
- 像批改纸质作业那样认真对待每一份作业

你的批改风格应该像一位真实的老师：既严格又温暖，既专业又亲和。`,
      },
    ];
    
    // 如果有图片，使用视觉模型
    if (submission.image_key) {
      try {
        const imageUrl = await storage.generatePresignedUrl({
          key: submission.image_key,
          expireTime: 3600,
        });
        
        console.log('图片URL生成成功，开始批改图片作业');
        
        messages.push({
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: promptText + '\n\n📌 注意：学生提交了图片作业，请仔细查看图片内容后进行批改。如果图片中有文字，请准确识别；如果是数学题或其他题型，请根据图片内容给出专业的批改意见。'
            },
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
        messages.push({ 
          role: 'user', 
          content: promptText + '\n\n⚠️ 注意：学生提交了图片作业，但图片加载失败，请根据学生提交的文字内容进行批改。'
        });
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
    
    // 提取分数（从评分明细中提取总分）
    let score = 85; // 默认分数
    
    // 尝试多种格式提取总分
    const patterns = [
      /总分[：:]\s*(\d+)\s*\/\s*100\s*分/,
      /总分[：:]\s*(\d+)\s*分/,
      /\*\*总分[：:]\s*(\d+)\s*\/\s*100\s*分\*\*/,
      /\*\*总分[：:]\s*(\d+)\s*分\*\*/,
      /(\d+)\s*\/\s*100\s*分/,
    ];
    
    for (const pattern of patterns) {
      const match = feedback.match(pattern);
      if (match && match[1]) {
        score = parseInt(match[1]);
        console.log(`成功提取分数: ${score}`);
        break;
      }
    }
    
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
