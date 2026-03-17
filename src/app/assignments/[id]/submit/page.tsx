'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Assignment } from '@/types';

export default function SubmitAssignmentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (assignmentId) {
      fetchAssignment();
    }
  }, [assignmentId]);

  const fetchAssignment = async () => {
    try {
      const response = await fetch(`/api/assignments?assignmentId=${assignmentId}`);
      const data = await response.json();
      if (data.assignments && data.assignments.length > 0) {
        setAssignment(data.assignments[0]);
      }
    } catch (error) {
      console.error('获取作业失败:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('图片大小不能超过10MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('assignmentId', assignmentId);
      formData.append('studentId', user?.id || '');
      formData.append('content', content);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await fetch('/api/submissions', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '提交失败');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'student') {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {assignment && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{assignment.title}</CardTitle>
              <CardDescription>{assignment.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                {assignment.requirements && (
                  <div className="mb-2">
                    <strong>要求：</strong> {assignment.requirements}
                  </div>
                )}
                {assignment.due_date && (
                  <div>
                    <strong>截止时间：</strong>{' '}
                    {new Date(assignment.due_date).toLocaleString('zh-CN')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>提交作业</CardTitle>
            <CardDescription>可以提交文字内容和图片</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content">文字内容</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="请输入作业内容（可选）"
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">上传图片（可选，支持JPG/PNG，最大10MB）</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="预览"
                      className="max-w-full h-auto rounded-lg border"
                      style={{ maxHeight: '400px' }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview('');
                      }}
                    >
                      移除图片
                    </Button>
                  </div>
                )}
              </div>

              {error && (
                <div className="text-sm text-red-500">{error}</div>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? '提交中...' : '提交作业'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
