import { NextResponse } from 'next/server';

export async function GET() {
  const envCheck = {
    COZE_SUPABASE_URL: process.env.COZE_SUPABASE_URL ? '已配置' : '❌ 未配置',
    COZE_SUPABASE_ANON_KEY: process.env.COZE_SUPABASE_ANON_KEY ? '已配置' : '❌ 未配置',
    COZE_BUCKET_ENDPOINT_URL: process.env.COZE_BUCKET_ENDPOINT_URL || '❌ 未配置',
    COZE_BUCKET_NAME: process.env.COZE_BUCKET_NAME || '❌ 未配置',
    NODE_ENV: process.env.NODE_ENV,
  };

  return NextResponse.json({
    message: '环境变量检查',
    env: envCheck,
    hint: '如果显示未配置，请在Netlify的 Site settings > Build & deploy > Environment 中添加环境变量',
  });
}
