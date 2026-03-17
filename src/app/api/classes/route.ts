import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { insertClassSchema } from '@/storage/database/shared/schema';
import { z } from 'zod';

// 获取班级列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const studentId = searchParams.get('studentId');
    
    const client = getSupabaseClient();
    
    if (teacherId) {
      // 获取老师创建的班级
      const { data: classes, error } = await client
        .from('classes')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });
      
      if (error) {
        return NextResponse.json({ error: '获取班级列表失败' }, { status: 500 });
      }
      
      return NextResponse.json({ classes });
    } else if (studentId) {
      // 获取学生加入的班级
      const { data: memberClasses, error: memberError } = await client
        .from('class_members')
        .select('class_id')
        .eq('student_id', studentId);
      
      if (memberError) {
        return NextResponse.json({ error: '获取班级列表失败' }, { status: 500 });
      }
      
      if (!memberClasses || memberClasses.length === 0) {
        return NextResponse.json({ classes: [] });
      }
      
      const classIds = memberClasses.map(m => m.class_id);
      
      const { data: classes, error } = await client
        .from('classes')
        .select('*')
        .in('id', classIds)
        .order('created_at', { ascending: false });
      
      if (error) {
        return NextResponse.json({ error: '获取班级列表失败' }, { status: 500 });
      }
      
      return NextResponse.json({ classes });
    } else {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }
  } catch (error) {
    console.error('获取班级列表错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 创建班级
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证输入
    const validatedData = insertClassSchema.parse(body);
    
    const client = getSupabaseClient();
    
    // 生成班级邀请码
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // 创建班级
    const { data: classData, error } = await client
      .from('classes')
      .insert({
        ...validatedData,
        code,
      })
      .select()
      .single();
    
    if (error) {
      console.error('创建班级失败:', error);
      return NextResponse.json({ error: '创建班级失败' }, { status: 500 });
    }
    
    return NextResponse.json({
      message: '创建班级成功',
      class: classData,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据格式错误', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('创建班级错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
