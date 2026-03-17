'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Submission, Assignment } from '@/types';

// 反馈显示组件 - 渲染Markdown格式的反馈
function FeedbackDisplay({ content }: { content: string }) {
  // 简单的Markdown渲染
  const renderMarkdown = (text: string) => {
    return text
      // 标题
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold mt-4 mb-2 text-gray-800">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-3 mb-2 text-gray-700">$1</h3>')
      // 粗体
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>')
      // 列表项
      .replace(/^- (.*$)/gim, '<li class="ml-4 my-1">$1</li>')
      // 分数高亮
      .replace(/(\d+)\s*\/\s*(\d+)\s*分/g, '<span class="text-blue-600 font-bold">$1/$2分</span>')
      // 总分特殊处理
      .replace(/总分[：:]\s*(\d+)\s*\/\s*100\s*分/g, '<span class="text-green-600 font-bold text-lg">总分：$1/100分</span>')
      // 换行
      .replace(/\n/g, '<br/>');
  };

  return (
    <div 
      className="text-sm leading-relaxed feedback-content"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

export default function SubmissionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role === 'teacher') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // 获取老师的作业
      const assignmentsResponse = await fetch(`/api/assignments?teacherId=${user?.id}`);
      const assignmentsData = await assignmentsResponse.json();
      setAssignments(assignmentsData.assignments || []);

      // 获取所有提交
      if (assignmentsData.assignments && assignmentsData.assignments.length > 0) {
        const assignmentIds = assignmentsData.assignments.map((a: Assignment) => a.id);
        const submissionsPromises = assignmentIds.map((id: string) =>
          fetch(`/api/submissions?assignmentId=${id}`).then(r => r.json())
        );
        const submissionsResults = await Promise.all(submissionsPromises);
        const allSubmissions = submissionsResults.flatMap(r => r.submissions || []);
        setSubmissions(allSubmissions);
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

  const handleAIGrade = async (submissionId: string) => {
    try {
      const response = await fetch('/api/ai-grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      });

      if (!response.ok) {
        throw new Error('AI批改失败');
      }

      // 刷新数据
      fetchData();
    } catch (error) {
      console.error('AI批改失败:', error);
      alert('AI批改失败，请重试');
    }
  };

  if (!user || user.role !== 'teacher') {
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
          <h1 className="text-2xl font-bold">学生提交列表</h1>
          <Button onClick={() => router.push('/dashboard')}>
            返回Dashboard
          </Button>
        </div>

        {submissions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-gray-500">
                还没有学生提交作业
              </div>
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
                            : '待批改'}
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
                          作业内容：
                        </div>
                        <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                          {submission.content}
                        </div>
                      </div>
                    )}

                    {submission.image_url && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          作业图片：
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
                          🤖 AI批改反馈：
                        </div>
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                          <FeedbackDisplay content={submission.feedback} />
                        </div>
                      </div>
                    )}

                    {submission.status === 'submitted' && (
                      <Button
                        onClick={() => handleAIGrade(submission.id)}
                        className="mt-2"
                      >
                        AI批改
                      </Button>
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
