import { NextRequest, NextResponse } from 'next/server';

async function getSupabaseClient() {
  const { getSupabaseClient: client } = await import('@/storage/database/supabase-client');
  return client();
}

async function getStorage() {
  const { S3Storage } = await import('coze-coding-dev-sdk');
  const endpointUrl = process.env.COZE_BUCKET_ENDPOINT_URL;
  const bucketName = process.env.COZE_BUCKET_NAME;
  if (!endpointUrl || !bucketName) throw new Error('存储环境变量未配置');
  return new S3Storage({ endpointUrl, accessKey: '', secretKey: '', bucketName, region: 'cn-beijing' });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');
    const studentId = searchParams.get('studentId');
    const client = await getSupabaseClient();
    let query = client.from('submissions').select('*');
    if (assignmentId) query = query.eq('assignment_id', assignmentId);
    if (studentId) query = query.eq('student_id', studentId);
    const { data: submissions, error } = await query.order('submitted_at', { ascending: false });
    if (error) return NextResponse.json({ error: '获取提交记录失败', details: error.message }, { status: 500 });
    try {
      const storage = await getStorage();
      for (const s of (submissions || [])) {
        if (s.image_key) {
          try { s.image_url = await storage.generatePresignedUrl({ key: s.image_key, expireTime: 86400 }); } catch {}
        }
      }
    } catch {}
    return NextResponse.json({ submissions: submissions || [] });
  } catch (error: any) {
    return NextResponse.json({ error: '服务器错误', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.COZE_SUPABASE_URL;
    const supabaseKey = process.env.COZE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: '数据库配置错误' }, { status: 500 });
    
    const formData = await request.formData();
    const assignmentId = formData.get('assignmentId') as string;
    const studentId = formData.get('studentId') as string;
    const content = formData.get('content') as string | null;
    const imageFile = formData.get('image') as File | null;
    
    if (!assignmentId || assignmentId === 'undefined') return NextResponse.json({ error: '作业ID无效' }, { status: 400 });
    if (!studentId || studentId === 'undefined') return NextResponse.json({ error: '学生ID无效，请重新登录' }, { status: 400 });
    
    const client = await getSupabaseClient();
    let imageKey: string | null = null, imageUrl: string | null = null;
    
    if (imageFile && imageFile.size > 0) {
      const storage = await getStorage();
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const ext = imageFile.name.split('.').pop() || 'jpg';
      const fileName = `submissions/${assignmentId}/${studentId}_${Date.now()}.${ext}`;
      imageKey = await storage.uploadFile({ fileContent: buffer, fileName, contentType: imageFile.type || 'image/jpeg' });
      imageUrl = await storage.generatePresignedUrl({ key: imageKey, expireTime: 86400 });
    }
    
    const insertData: Record<string, any> = { assignment_id: assignmentId, student_id: studentId, status: 'submitted' };
    if (content?.trim()) insertData.content = content.trim();
    if (imageKey) insertData.image_key = imageKey;
    if (imageUrl) insertData.image_url = imageUrl;
    
    const { data: submission, error } = await client.from('submissions').insert(insertData).select().single();
    if (error) return NextResponse.json({ error: '提交作业失败', details: error.message }, { status: 500 });
    return NextResponse.json({ success: true, message: '提交作业成功', submission });
  } catch (error: any) {
    return NextResponse.json({ error: '服务器错误', details: error.message }, { status: 500 });
  }
}
