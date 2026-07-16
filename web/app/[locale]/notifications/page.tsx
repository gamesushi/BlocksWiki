/**
 * 通知页：列出我的通知，进入即全部标记已读。
 */
import Link from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/app/actions/auth';
import { getNotifications, markAllRead } from '@/app/actions/notifications';
import { NotificationRow } from '@/components/notification-row';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const t = await getTranslations('Notifications');
  const tc = await getTranslations('Common');
  const tn = await getTranslations('Nav');
  const session = await getSession();
  if (!session) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-sm bw-muted">
          <Link href="/login" className="text-base-content underline">{tn('login')}</Link> {t('viewHint')}
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
        <h1 className="text-lg font-medium tracking-tight">{t('title')}</h1>
        <Link href="/" className="text-sm bw-muted hover:text-base-content">{tc('backHome')}</Link>
      </header>

      {items.length === 0 ? (
        <p className="text-sm bw-muted">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-base-300/60">
          {items.map((n) => (
            <NotificationRow key={n.documentId} n={n} />
          ))}
        </ul>
      )}
    </main>
  );
}
