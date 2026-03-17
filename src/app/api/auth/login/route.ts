import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '密码不能为空'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证输入
    const validatedData = loginSchema.parse(body);
    
    const client = getSupabaseClient();
    
    // 查询用户
    const { data: user, error } = await client
      .from('users')
      .select('*')
      .eq('email', validatedData.email)
      .single();
    
    if (error || !user) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      );
    }
    
    // 验证密码（实际项目中应该使用加密比对）
    if (user.password !== validatedData.password) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      );
    }
    
    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;
    
    return NextResponse.json({
      message: '登录成功',
      user: userWithoutPassword,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据格式错误', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('登录错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
