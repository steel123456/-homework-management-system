import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';

export const metadata: Metadata = {
  title: {
    default: '作业管理系统 | AI智能批改',
    template: '%s | 作业管理系统',
  },
  description: 'AI智能批改作业系统，支持实时通知、班级管理、作业提交等功能',
  keywords: [
    '作业管理',
    'AI批改',
    '班级管理',
    '作业提交',
    '在线教育',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
