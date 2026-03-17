import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classId } = await params;
    
    const client = getSupabaseClient();
    
    // 获取班级成员
    const { data: members, error: membersError } = await client
      .from('class_members')
      .select('id, student_id, joined_at')
      .eq('class_id', classId);
    
    if (membersError) {
      return NextResponse.json({ error: '获取班级成员失败' }, { status: 500 });
    }
    
    if (!members || members.length === 0) {
      return NextResponse.json({ members: [] });
    }
    
    // 获取学生详细信息
    const studentIds = members.map(m => m.student_id);
    const { data: students, error: studentsError } = await client
      .from('users')
      .select('id, name, email, avatar')
      .in('id', studentIds);
    
    if (studentsError) {
      return NextResponse.json({ error: '获取学生信息失败' }, { status: 500 });
    }
    
    // 合并数据
    const membersWithDetails = members.map(member => {
      const student = students?.find(s => s.id === member.student_id);
      return {
        ...member,
        student,
      };
    });
    
    return NextResponse.json({ members: membersWithDetails });
  } catch (error) {
    console.error('获取班级成员错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
