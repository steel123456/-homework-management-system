'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Assignment, Class } from '@/types';

export default function AssignmentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // 获取学生加入的班级
      const classesResponse = await fetch(`/api/classes?studentId=${user?.id}`);
      const classesData = await classesResponse.json();
      setClasses(classesData.classes || []);

      // 获取这些班级的作业
      if (classesData.classes && classesData.classes.length > 0) {
        const classIds = classesData.classes.map((c: Class) => c.id);
        const assignmentsPromises = classIds.map((classId: string) =>
          fetch(`/api/assignments?classId=${classId}`).then(r => r.json())
        );
        const assignmentsResults = await Promise.all(assignmentsPromises);
        const allAssignments = assignmentsResults.flatMap(r => r.assignments || []);
        setAssignments(allAssignments);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getClassInfo = (classId: string) => {
    return classes.find(c => c.id === classId);
  };

  if (!user || user.role !== 'student') {
    router.push('/dashboard');
    return null;
  }

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
          <h1 className="text-2xl font-bold">作业列表</h1>
          <Button onClick={() => router.push('/classes/join')}>
            加入新班级
          </Button>
        </div>

        {assignments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-gray-500">
                还没有作业，请先加入班级
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.map((assignment) => {
              const classInfo = getClassInfo(assignment.class_id);
              return (
                <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{assignment.title}</CardTitle>
                    <CardDescription>
                      {classInfo?.name || '未知班级'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600 mb-4">
                      {assignment.description || '暂无描述'}
                    </div>
                    {assignment.due_date && (
                      <div className="text-sm text-gray-500 mb-4">
                        截止时间：{new Date(assignment.due_date).toLocaleString('zh-CN')}
                      </div>
                    )}
                    <Button
                      onClick={() => router.push(`/assignments/${assignment.id}/submit`)}
                      className="w-full"
                    >
                      提交作业
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
