'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Class } from '@/types';

export default function CreateAssignmentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [classId, setClassId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && user.role === 'teacher') {
      fetchClasses();
    }
  }, [user]);

  const fetchClasses = async () => {
    try {
      const response = await fetch(`/api/classes?teacherId=${user?.id}`);
      const data = await response.json();
      setClasses(data.classes || []);
      if (data.classes && data.classes.length > 0) {
        setClassId(data.classes[0].id);
      }
    } catch (error) {
      console.error('获取班级失败:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          title,
          description,
          requirements,
          dueDate: dueDate || null,
          teacherId: user?.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '创建失败');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'teacher') {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle>发布作业</CardTitle>
            <CardDescription>为学生发布新的作业</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="classId">选择班级 *</Label>
                <select
                  id="classId"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
                {classes.length === 0 && (
                  <div className="text-sm text-gray-500">
                    还没有创建班级，请先创建班级
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">作业标题 *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="请输入作业标题"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">作业描述</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="请输入作业描述"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements">作业要求</Label>
                <Textarea
                  id="requirements"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="请输入作业要求"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">截止时间</Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              {error && (
                <div className="text-sm text-red-500">{error}</div>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={loading || classes.length === 0}>
                  {loading ? '发布中...' : '发布作业'}
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
