/**
 * 首页 Feed：全站最新 Block 网格。
 * 登录后每张卡片带 Connect 按钮 —— 平台的核心动线在这里发生。
 */
import Link from 'next/link';
import { getSession, logout } from '@/app/actions/auth';
import { loadFeedPage } from '@/app/actions/feed';
import { getUnreadCount } from '@/app/actions/notifications';
import { NewChannelForm } from '@/components/new-channel-form';
import { PaginatedBlocks } from '@/components/paginated-blocks';
import { SearchBar } from '@/components/search-bar';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getSession();
  const me = session?.me ?? null;
  const myChannels = session?.channels ?? [];

  const [firstPage, unread] = await Promise.all([
    loadFeedPage(1),
    me ? getUnreadCount() : Promise.resolve(0),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-10 flex flex-wrap items-center gap-4">
        <nav className="flex items-center gap-3 text-sm text-neutral-500">
          {me && <Link href="/feed" className="hover:text-neutral-900">动态</Link>}
          {me && (
            <Link href="/notifications" className="relative hover:text-neutral-900">
              通知
              {unread > 0 && (
                <span className="absolute -right-3 -top-1.5 rounded-full bg-red-500 px-1.5 text-[10px] leading-4 text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
          )}
          <Link href="/wiki" className="hover:text-neutral-900">Wiki</Link>
          <Link href="/explore" className="hover:text-neutral-900">探索</Link>
          <Link href="/search" className="hover:text-neutral-900">搜索</Link>
          <Link href="/publish" className="hover:text-neutral-900">发布</Link>
          <Link href="/capture" className="hover:text-neutral-900">快速采集</Link>
        </nav>
      </header>

      <div className="mb-10">
        <SearchBar />
      </div>

      {me && (
        <section className="mb-10 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs uppercase tracking-widest text-neutral-400">My Channels</span>
          {myChannels.map((ch) => (
            <Link
              key={ch.documentId}
              href={`/channel/${ch.slug}`}
              className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
            >
              {ch.title}
            </Link>
          ))}
          <NewChannelForm />
        </section>
      )}

      <PaginatedBlocks
        initialBlocks={firstPage.blocks}
        initialHasMore={firstPage.hasMore}
        myChannels={myChannels}
        showConnect={!!me}
        loadMore={loadFeedPage}
      />
    </main>
  );
}
