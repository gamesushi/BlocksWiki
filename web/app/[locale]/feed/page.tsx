/**
 * 动态流：我关注的用户与频道的连结活动，按时间倒序。
 */
import Link from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/app/actions/auth';
import { getFeed } from '@/app/actions/follow';
import { PaginatedFeed } from '@/components/paginated-feed';

export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  const t = await getTranslations('Feed');
  const tc = await getTranslations('Common');
  const tn = await getTranslations('Nav');
  const session = await getSession();

  if (!session) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-sm text-neutral-400">
          <Link href="/login" className="text-neutral-900 underline">{tn('login')}</Link> {t('viewHint')}
        </p>
      </main>
    );
  }

  const first = await getFeed(1);
  const followsNothing = session.following.length === 0 && session.followedChannelIds.length === 0;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-baseline gap-4">
        <h1 className="text-lg font-medium tracking-tight">{t('title')}</h1>
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-900">{tc('backHome')}</Link>
      </header>

      {followsNothing ? (
        <p className="text-sm text-neutral-400">
          {t.rich('noFollow', {
            explore: (chunks) => (
              <Link href="/explore" className="text-neutral-900 underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      ) : first.items.length === 0 ? (
        <p className="text-sm text-neutral-400">{t('emptyFollow')}</p>
      ) : (
        <PaginatedFeed initialItems={first.items} initialHasMore={first.hasMore} />
      )}
    </main>
  );
}
