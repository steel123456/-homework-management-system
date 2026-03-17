import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { insertAssignmentSchema } from '@/storage/database/shared/schema';
import { z } from 'zod';

// 获取作业列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const teacherId = searchParams.get('teacherId');
    
    const client = getSupabaseClient();
    
    let query = client.from('assignments').select('*');
    
    if (classId) {
      query = query.eq('class_id', classId);
    } else if (teacherId) {
      query = query.eq('teacher_id', teacherId);
    } else {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }
    
    const { data: assignments, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: '获取作业列表失败' }, { status: 500 });
    }
    
    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('获取作业列表错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 创建作业
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证输入
    const validatedData = insertAssignmentSchema.parse(body);
    
    const client = getSupabaseClient();
    
    // 创建作业（使用数据库字段名）
    const { data: assignment, error } = await client
      .from('assignments')
      .insert({
        class_id: validatedData.classId,
        title: validatedData.title,
        description: validatedData.description,
        requirements: validatedData.requirements,
        due_date: validatedData.dueDate,
        teacher_id: validatedData.teacherId,
      })
      .select()
      .single();
    
    if (error) {
      console.error('创建作业失败:', error);
      return NextResponse.json({ error: '创建作业失败' }, { status: 500 });
    }
    
    return NextResponse.json({
      message: '创建作业成功',
      assignment,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据格式错误', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('创建作业错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
