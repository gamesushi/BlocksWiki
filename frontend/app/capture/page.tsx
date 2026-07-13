import type { Metadata, Viewport } from 'next';
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
      <QuickCapture />
    </main>
  );
}
