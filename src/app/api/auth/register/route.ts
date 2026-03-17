import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { insertUserSchema } from '@/storage/database/shared/schema';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证输入
    const validatedData = insertUserSchema.parse(body);
    
    const client = getSupabaseClient();
    
    // 检查邮箱是否已存在
    const { data: existingUser } = await client
      .from('users')
      .select('id')
      .eq('email', validatedData.email)
      .single();
    
    if (existingUser) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 400 }
      );
    }
    
    // 创建用户
    const { data: user, error } = await client
      .from('users')
      .insert({
        ...validatedData,
        role: validatedData.role || 'student',
      })
      .select()
      .single();
    
    if (error) {
      console.error('注册失败:', error);
      return NextResponse.json(
        { error: '注册失败' },
        { status: 500 }
      );
    }
    
    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;
    
    return NextResponse.json({
      message: '注册成功',
      user: userWithoutPassword,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据格式错误', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('注册错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
