'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CreateClassPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdClass, setCreatedClass] = useState<{ id: string; invite_code: string; name: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          teacherId: user?.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '创建失败');
      }

      const data = await response.json();
      setCreatedClass(data.class);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (createdClass) {
      navigator.clipboard.writeText(createdClass.invite_code);
      alert('邀请码已复制！');
    }
  };

  if (!user || user.role !== 'teacher') {
    router.push('/dashboard');
    return null;
  }

  // 创建成功，显示邀请码
  if (createdClass) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">✅ 班级创建成功！</CardTitle>
              <CardDescription>请将邀请码分享给学生，让他们加入班级</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-lg text-center">
                <div className="text-sm text-gray-600 mb-2">班级名称</div>
                <div className="text-xl font-bold mb-4">{createdClass.name}</div>
                
                <div className="text-sm text-gray-600 mb-2">班级邀请码</div>
                <div className="text-4xl font-mono font-bold text-blue-600 tracking-widest mb-4">
                  {createdClass.invite_code}
                </div>
                
                <Button onClick={handleCopyCode} className="mt-2">
                  📋 复制邀请码
                </Button>
              </div>
              
              <div className="flex gap-4">
                <Button onClick={() => router.push('/dashboard')}>
                  返回Dashboard
                </Button>
                <Button variant="outline" onClick={() => router.push(`/classes/${createdClass.id}`)}>
                  查看班级详情
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle>创建班级</CardTitle>
            <CardDescription>创建一个新的班级，学生可以通过邀请码加入</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">班级名称 *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入班级名称"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">班级描述</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="请输入班级描述"
                  rows={3}
                />
              </div>

              {error && (
                <div className="text-sm text-red-500">{error}</div>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? '创建中...' : '创建班级'}
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
