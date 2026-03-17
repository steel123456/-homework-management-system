'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Class, ClassMember, Assignment } from '@/types';

export default function ClassDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;

  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (classId) {
      fetchData();
    }
  }, [classId]);

  const fetchData = async () => {
    try {
      // 获取班级信息
      const classResponse = await fetch(`/api/classes?classId=${classId}`);
      const classData = await classResponse.json();
      setClassInfo(classData.class || null);

      // 获取班级成员
      const membersResponse = await fetch(`/api/classes/${classId}/members`);
      const membersData = await membersResponse.json();
      setMembers(membersData.members || []);

      // 获取作业列表
      const assignmentsResponse = await fetch(`/api/assignments?classId=${classId}`);
      const assignmentsData = await assignmentsResponse.json();
      setAssignments(assignmentsData.assignments || []);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{classInfo?.name || '班级详情'}</h1>
            {classInfo && (
              <p className="text-gray-600 mt-1">
                邀请码：<span className="font-mono font-bold text-blue-600 text-lg">{classInfo.invite_code}</span>
              </p>
            )}
          </div>
          <Button onClick={() => router.push('/dashboard')}>
            返回Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 班级成员 */}
          <Card>
            <CardHeader>
              <CardTitle>班级成员 ({members.length}人)</CardTitle>
              <CardDescription>已加入班级的学生</CardDescription>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  还没有学生加入
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div>
                        <div className="font-medium">{member.student?.name}</div>
                        <div className="text-sm text-gray-500">{member.student?.email}</div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(member.joined_at).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 作业列表 */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>作业列表 ({assignments.length}个)</CardTitle>
                  <CardDescription>班级发布的作业</CardDescription>
                </div>
                {user?.role === 'teacher' && (
                  <Button
                    size="sm"
                    onClick={() => router.push('/assignments/create')}
                  >
                    发布作业
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  还没有发布作业
                </div>
              ) : (
                <div className="space-y-2">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (user?.role === 'student') {
                          router.push(`/assignments/${assignment.id}/submit`);
                        }
                      }}
                    >
                      <div className="font-medium">{assignment.title}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {assignment.description || '暂无描述'}
                      </div>
                      {assignment.due_date && (
                        <div className="text-xs text-gray-400 mt-1">
                          截止：{new Date(assignment.due_date).toLocaleString('zh-CN')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
