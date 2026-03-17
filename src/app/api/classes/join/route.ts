import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { z } from 'zod';

const joinClassSchema = z.object({
  code: z.string().min(1, '班级邀请码不能为空'),
  studentId: z.string().min(1, '学生ID不能为空'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证输入
    const validatedData = joinClassSchema.parse(body);
    
    const client = getSupabaseClient();
    
    // 查找班级
    const { data: classData, error: classError } = await client
      .from('classes')
      .select('*')
      .eq('code', validatedData.code)
      .single();
    
    if (classError || !classData) {
      return NextResponse.json({ error: '班级邀请码无效' }, { status: 404 });
    }
    
    // 检查是否已经加入
    const { data: existingMember } = await client
      .from('class_members')
      .select('id')
      .eq('class_id', classData.id)
      .eq('student_id', validatedData.studentId)
      .single();
    
    if (existingMember) {
      return NextResponse.json({ error: '您已经加入该班级' }, { status: 400 });
    }
    
    // 加入班级
    const { data: member, error } = await client
      .from('class_members')
      .insert({
        class_id: classData.id,
        student_id: validatedData.studentId,
      })
      .select()
      .single();
    
    if (error) {
      console.error('加入班级失败:', error);
      return NextResponse.json({ error: '加入班级失败' }, { status: 500 });
    }
    
    return NextResponse.json({
      message: '加入班级成功',
      class: classData,
      member,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据格式错误', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('加入班级错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
