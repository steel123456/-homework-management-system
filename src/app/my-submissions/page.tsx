'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Submission, Assignment } from '@/types';

export default function MySubmissionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role === 'student') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // 获取学生的提交
      const submissionsResponse = await fetch(`/api/submissions?studentId=${user?.id}`);
      const submissionsData = await submissionsResponse.json();
      setSubmissions(submissionsData.submissions || []);

      // 获取作业信息
      if (submissionsData.submissions && submissionsData.submissions.length > 0) {
        const assignmentIds = [...new Set(submissionsData.submissions.map((s: Submission) => s.assignment_id))];
        const assignmentsPromises = assignmentIds.map((id: string) =>
          fetch(`/api/assignments?assignmentId=${id}`).then(r => r.json())
        );
        const assignmentsResults = await Promise.all(assignmentsPromises);
        const allAssignments = assignmentsResults
          .map(r => r.assignments?.[0])
          .filter(Boolean);
        setAssignments(allAssignments);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAssignmentInfo = (assignmentId: string) => {
    return assignments.find(a => a.id === assignmentId);
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
          <h1 className="text-2xl font-bold">我的提交记录</h1>
          <Button onClick={() => router.push('/dashboard')}>
            返回Dashboard
          </Button>
        </div>

        {submissions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-gray-500">
                还没有提交任何作业
              </div>
              <Button
                className="mt-4"
                onClick={() => router.push('/assignments')}
              >
                去查看作业
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => {
              const assignment = getAssignmentInfo(submission.assignment_id);
              return (
                <Card key={submission.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {assignment?.title || '未知作业'}
                        </CardTitle>
                        <CardDescription>
                          提交时间：{new Date(submission.submitted_at).toLocaleString('zh-CN')}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            submission.status === 'graded'
                              ? 'bg-green-100 text-green-800'
                              : submission.status === 'grading'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {submission.status === 'graded'
                            ? '已批改'
                            : submission.status === 'grading'
                            ? '批改中'
                            : '已提交'}
                        </span>
                        {submission.score !== null && (
                          <span className="text-lg font-bold text-blue-600">
                            {submission.score}分
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {submission.content && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          我的答案：
                        </div>
                        <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                          {submission.content}
                        </div>
                      </div>
                    )}

                    {submission.image_url && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          上传的图片：
                        </div>
                        <img
                          src={submission.image_url}
                          alt="作业图片"
                          className="max-w-full h-auto rounded border"
                          style={{ maxHeight: '400px' }}
                        />
                      </div>
                    )}

                    {submission.feedback && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          老师反馈：
                        </div>
                        <div className="bg-green-50 p-3 rounded text-sm whitespace-pre-wrap">
                          {submission.feedback}
                        </div>
                      </div>
                    )}
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
