import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { S3Storage } from 'coze-coding-dev-sdk';

function getStorage() {
  const endpointUrl = process.env.COZE_BUCKET_ENDPOINT_URL;
  const bucketName = process.env.COZE_BUCKET_NAME;
  if (!endpointUrl || !bucketName) {
    throw new Error('对象存储环境变量未配置');
  }
  return new S3Storage({
    endpointUrl,
    accessKey: '',
    secretKey: '',
    bucketName,
    region: 'cn-beijing',
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');
    const studentId = searchParams.get('studentId');
    
    const client = getSupabaseClient();
    let query = client.from('submissions').select('*');
    if (assignmentId) query = query.eq('assignment_id', assignmentId);
    if (studentId) query = query.eq('student_id', studentId);
    
    const { data: submissions, error } = await query.order('submitted_at', { ascending: false });
    if (error) return NextResponse.json({ error: '获取提交记录失败' }, { status: 500 });
    
    const storage = getStorage();
    const submissionsWithUrls = await Promise.all(
      (submissions || []).map(async (submission) => {
        if (submission.image_key) {
          try {
            const imageUrl = await storage.generatePresignedUrl({ key: submission.image_key, expireTime: 86400 });
            return { ...submission, image_url: imageUrl };
          } catch { return submission; }
        }
        return submission;
      })
    );
    return NextResponse.json({ submissions: submissionsWithUrls });
  } catch (error: any) {
    return NextResponse.json({ error: '服务器错误', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.COZE_SUPABASE_URL;
    const supabaseKey = process.env.COZE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: '数据库配置错误' }, { status: 500 });
    }
    
    const formData = await request.formData();
    const assignmentId = formData.get('assignmentId') as string;
    const studentId = formData.get('studentId') as string;
    const content = formData.get('content') as string;
    const imageFile = formData.get('image') as File | null;
    
    if (!assignmentId || !studentId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }
    
    const client = getSupabaseClient();
    let imageKey: string | null = null;
    let imageUrl: string | null = null;
    
    if (imageFile && imageFile.size > 0) {
      const storage = getStorage();
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = imageFile.name.split('.').pop() || 'jpg';
      const fileName = `submissions/${assignmentId}/${studentId}_${timestamp}_${randomStr}.${ext}`;
      
      imageKey = await storage.uploadFile({
        fileContent: buffer,
        fileName,
        contentType: imageFile.type || 'image/jpeg',
      });
      imageUrl = await storage.generatePresignedUrl({ key: imageKey, expireTime: 86400 });
    }
    
    const insertData: any = {
      assignment_id: assignmentId,
      student_id: studentId,
      status: 'submitted',
    };
    if (content?.trim()) insertData.content = content.trim();
    if (imageKey) insertData.image_key = imageKey;
    if (imageUrl) insertData.image_url = imageUrl;
    
    const { data: submission, error } = await client
      .from('submissions')
      .insert(insertData)
      .select()
      .single();
    
    if (error) return NextResponse.json({ error: '提交作业失败', details: error.message }, { status: 500 });
    return NextResponse.json({ message: '提交作业成功', submission });
  } catch (error: any) {
    return NextResponse.json({ error: '服务器错误', details: error.message }, { status: 500 });
  }
}
