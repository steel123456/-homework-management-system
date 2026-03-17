import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { S3Storage } from 'coze-coding-dev-sdk';
import { insertSubmissionSchema } from '@/storage/database/shared/schema';
import { z } from 'zod';

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// 获取提交记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');
    const studentId = searchParams.get('studentId');
    
    const client = getSupabaseClient();
    
    let query = client.from('submissions').select('*');
    
    if (assignmentId) {
      query = query.eq('assignment_id', assignmentId);
    }
    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    
    const { data: submissions, error } = await query.order('submitted_at', { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: '获取提交记录失败' }, { status: 500 });
    }
    
    // 为有图片的提交生成访问URL
    const submissionsWithUrls = await Promise.all(
      (submissions || []).map(async (submission) => {
        if (submission.image_key) {
          try {
            const imageUrl = await storage.generatePresignedUrl({
              key: submission.image_key,
              expireTime: 86400,
            });
            return { ...submission, image_url: imageUrl };
          } catch (error) {
            console.error('生成图片URL失败:', error);
            return submission;
          }
        }
        return submission;
      })
    );
    
    return NextResponse.json({ submissions: submissionsWithUrls });
  } catch (error) {
    console.error('获取提交记录错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 提交作业
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const assignmentId = formData.get('assignmentId') as string;
    const studentId = formData.get('studentId') as string;
    const content = formData.get('content') as string;
    const imageFile = formData.get('image') as File | null;
    
    // 验证基本数据
    const validatedData = insertSubmissionSchema.parse({
      assignmentId,
      studentId,
      content: content || null,
    });
    
    const client = getSupabaseClient();
    
    let imageKey: string | null = null;
    let imageUrl: string | null = null;
    
    // 如果有图片，上传到对象存储
    if (imageFile && imageFile.size > 0) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const fileName = `submissions/${assignmentId}/${studentId}_${Date.now()}_${imageFile.name}`;
      
      try {
        imageKey = await storage.uploadFile({
          fileContent: buffer,
          fileName,
          contentType: imageFile.type,
        });
        
        // 生成访问URL
        imageUrl = await storage.generatePresignedUrl({
          key: imageKey,
          expireTime: 86400,
        });
      } catch (error) {
        console.error('上传图片失败:', error);
        return NextResponse.json({ error: '上传图片失败' }, { status: 500 });
      }
    }
    
    // 创建提交记录
    const { data: submission, error } = await client
      .from('submissions')
      .insert({
        ...validatedData,
        image_key: imageKey,
        image_url: imageUrl,
        status: 'submitted',
      })
      .select()
      .single();
    
    if (error) {
      console.error('提交作业失败:', error);
      return NextResponse.json({ error: '提交作业失败' }, { status: 500 });
    }
    
    return NextResponse.json({
      message: '提交作业成功',
      submission,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据格式错误', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('提交作业错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
