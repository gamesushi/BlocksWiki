import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { QuickCapture } from '@/components/quick-capture';

export const metadata: Metadata = {
  title: '快速采集 · BlockWiki',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BlockWiki',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 采集页禁缩放：避免 iOS 上 textarea 聚焦触发页面放大，打断 10 秒采集流
  maximumScale: 1,
  userScalable: false,
};

export default function CapturePage() {
  return (
    <main className="min-h-dvh bg-neutral-50">
      <header className="mx-auto flex max-w-md items-center px-5 pt-6">
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-900">
          ← 返回
        </Link>
      </header>
      <QuickCapture />
    </main>
  );
}
