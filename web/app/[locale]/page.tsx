/**
 * 首页 Feed：全站最新 Block 网格。
 * 登录后每张卡片带 Connect 按钮 —— 平台的核心动线在这里发生。
 */
import Link from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/app/actions/auth';
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

  const t = await getTranslations('Nav');
  const tc = await getTranslations('Channel');

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 sm:py-10">
      {/* 区块导航 */}
      <nav className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {me && (
          <Link href="/feed" className="link link-hover text-base-content/70 hover:text-primary">
            {t('feed')}
          </Link>
        )}
        {me && (
          <Link
            href="/notifications"
            className="link link-hover relative text-base-content/70 hover:text-primary"
          >
            {t('notifications')}
            {unread > 0 && (
              <span className="badge badge-primary badge-xs absolute -right-3 -top-2">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
        )}
        <Link href="/wiki" className="link link-hover text-base-content/70 hover:text-primary">
          {t('wiki')}
        </Link>
        <Link href="/explore" className="link link-hover text-base-content/70 hover:text-primary">
          {t('explore')}
        </Link>
        <Link href="/search" className="link link-hover text-base-content/70 hover:text-primary">
          {t('search')}
        </Link>
        <Link href="/publish" className="link link-hover text-base-content/70 hover:text-primary">
          {t('publish')}
        </Link>
      </nav>

      {/* 搜索 */}
      <div className="mb-8">
        <SearchBar />
      </div>

      {/* 我的频道 */}
      {me && (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-base-content/40">
            {tc('myChannels')}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {myChannels.map((ch) => (
              <Link
                key={ch.documentId}
                href={`/channel/${ch.slug}`}
                className="badge badge-ghost badge-lg gap-1 border-base-300 hover:border-primary hover:text-primary"
              >
                {ch.title}
              </Link>
            ))}
            <NewChannelForm />
          </div>
        </section>
      )}

      {/* Feed 网格 */}
      <PaginatedBlocks
        initialBlocks={firstPage.blocks}
        initialHasMore={firstPage.hasMore}
        myChannels={myChannels}
        showConnect={!!me}
        loadMore={loadFeedPage}
        gridClassName="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:gap-6"
      />
    </main>
  );
}
