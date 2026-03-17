'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Class, Assignment, Submission } from '@/types';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // WebSocket实时通知
  const { send } = useWebSocket('/ws/notifications', (msg) => {
    console.log('收到WebSocket消息:', msg);
    if (msg.type === 'submission_update') {
      // 刷新提交列表
      fetchSubmissions();
    }
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      await Promise.all([fetchClasses(), fetchAssignments(), fetchSubmissions()]);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchClasses = async () => {
    if (!user) return;
    
    const params = user.role === 'teacher' 
      ? `teacherId=${user.id}` 
      : `studentId=${user.id}`;
    
    const response = await fetch(`/api/classes?${params}`);
    const data = await response.json();
    setClasses(data.classes || []);
  };

  const fetchAssignments = async () => {
    if (!user || user.role !== 'teacher') return;
    
    const response = await fetch(`/api/assignments?teacherId=${user.id}`);
    const data = await response.json();
    setAssignments(data.assignments || []);
  };

  const fetchSubmissions = async () => {
    if (!user) return;
    
    if (user.role === 'student') {
      const response = await fetch(`/api/submissions?studentId=${user.id}`);
      const data = await response.json();
      setSubmissions(data.submissions || []);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航栏 */}
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">作业管理系统</h1>
              <span className="ml-4 text-sm text-gray-500">
                {user.role === 'teacher' ? '教师端' : '学生端'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm">欢迎，{user.name}</span>
              <Button onClick={handleLogout} variant="outline">
                退出登录
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容区域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {dataLoading ? (
          <div className="text-center py-8">加载数据中...</div>
        ) : (
          <div className="space-y-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>班级数量</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{classes.length}</div>
                </CardContent>
              </Card>
              
              {user.role === 'teacher' ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>作业数量</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{assignments.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>待批改</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-orange-500">
                        {submissions.filter(s => s.status === 'submitted').length}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>已提交</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-500">
                        {submissions.length}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>已批改</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-500">
                        {submissions.filter(s => s.status === 'graded').length}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* 功能按钮 */}
            <div className="flex flex-wrap gap-4">
              {user.role === 'teacher' ? (
                <>
                  <Button onClick={() => router.push('/classes/create')}>
                    创建班级
                  </Button>
                  <Button onClick={() => router.push('/assignments/create')}>
                    发布作业
                  </Button>
                  <Button onClick={() => router.push('/submissions')}>
                    查看提交
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => router.push('/classes/join')}>
                    加入班级
                  </Button>
                  <Button onClick={() => router.push('/assignments')}>
                    查看作业
                  </Button>
                  <Button onClick={() => router.push('/my-submissions')}>
                    我的提交
                  </Button>
                </>
              )}
            </div>

            {/* 班级列表 */}
            <Card>
              <CardHeader>
                <CardTitle>我的班级</CardTitle>
                <CardDescription>
                  {user.role === 'teacher' ? '您创建的班级' : '您加入的班级'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {classes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {user.role === 'teacher' ? '还没有创建班级' : '还没有加入班级'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classes.map((cls) => (
                      <Card key={cls.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => router.push(`/classes/${cls.id}`)}>
                        <CardHeader>
                          <CardTitle className="text-lg">{cls.name}</CardTitle>
                          <CardDescription>
                            {cls.description || '暂无描述'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-gray-500">
                            邀请码: {cls.code}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
