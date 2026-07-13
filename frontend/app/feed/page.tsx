/**
 * 动态流：我关注的用户与频道的连结活动，按时间倒序。
 */
import Link from 'next/link';
import { getSession } from '@/app/actions/auth';
import { getFeed } from '@/app/actions/follow';
import { PaginatedFeed } from '@/components/paginated-feed';

export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  const session = await getSession();

  if (!session) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-sm text-neutral-400">
          <Link href="/login" className="text-neutral-900 underline">登录</Link> 后查看你关注的动态。
        </p>
      </main>
    );
  }

  const first = await getFeed(1);
  const followsNothing = session.following.length === 0 && session.followedChannelIds.length === 0;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-baseline gap-4">
        <h1 className="text-lg font-medium tracking-tight">动态</h1>
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-900">← BlockWiki</Link>
      </header>

      {followsNothing ? (
        <p className="text-sm text-neutral-400">
          还没有关注任何人或频道。去 <Link href="/explore" className="text-neutral-900 underline">探索</Link> 关注一些吧。
        </p>
      ) : first.items.length === 0 ? (
        <p className="text-sm text-neutral-400">关注的用户与频道还没有新动态。</p>
      ) : (
        <PaginatedFeed initialItems={first.items} initialHasMore={first.hasMore} />
      )}
    </main>
  );
}
