/**
 * 通知页：列出我的通知，进入即全部标记已读。
 */
import Link from 'next/link';
import { getSession } from '@/app/actions/auth';
import { getNotifications, markAllRead } from '@/app/actions/notifications';
import { NotificationRow } from '@/components/notification-row';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-sm text-neutral-400">
          <Link href="/login" className="text-neutral-900 underline">登录</Link> 后查看通知。
        </p>
      </main>
    );
  }

  const items = await getNotifications();
  // 渲染后标记已读（下次进入 badge 归零）
  await markAllRead();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-baseline gap-4">
        <h1 className="text-lg font-medium tracking-tight">通知</h1>
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-900">← LifeWiki</Link>
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-400">还没有通知。</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {items.map((n) => (
            <NotificationRow key={n.documentId} n={n} />
          ))}
        </ul>
      )}
    </main>
  );
}
