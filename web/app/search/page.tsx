/**
 * 搜索页：Block 全文（searchText $containsi）+ 频道（标题/描述）。
 * 结果分页复用 PaginatedBlocks，loadMore 绑定当前 query。
 */
import Link from 'next/link';
import { getSession } from '@/app/actions/auth';
import { searchBlocks, searchChannels } from '@/app/actions/search';
import { SearchBar } from '@/components/search-bar';
import { PaginatedBlocks } from '@/components/paginated-blocks';

export const dynamic = 'force-dynamic';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const query = q.trim();

  const [session, blockPage, channels] = await Promise.all([
    getSession(),
    query ? searchBlocks(query, 1) : Promise.resolve({ blocks: [], hasMore: false, page: 1 }),
    query ? searchChannels(query) : Promise.resolve([]),
  ]);
  const myChannels = session?.channels ?? [];

  return (
    <main className="px-6 py-10">
      <header className="mb-8 flex items-baseline gap-4">
        <h1 className="text-lg font-medium tracking-tight">搜索</h1>
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-900">← BlocksWiki</Link>
      </header>

      <div className="mb-10 max-w-xl">
        <SearchBar defaultValue={query} instant />
      </div>

      {!query && <p className="text-sm text-neutral-400">输入关键词搜索生活 Block 与频道。</p>}

      {query && (
        <>
          {channels.length > 0 && (
            <section className="mb-12">
              <h2 className="mb-3 text-xs uppercase tracking-widest text-neutral-400">
                频道 · {channels.length}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {channels.map((ch) => (
                  <li key={ch.documentId}>
                    <Link
                      href={`/channel/${ch.slug}`}
                      className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
                    >
                      {ch.title}
                      {ch.visibility === 'private' && <span className="text-neutral-300">🔒</span>}
                      <span className="text-neutral-300">· {ch.connectionCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-4 text-xs uppercase tracking-widest text-neutral-400">Blocks</h2>
            {blockPage.blocks.length === 0 ? (
              <p className="text-sm text-neutral-400">没有匹配「{query}」的 Block。</p>
            ) : (
              <PaginatedBlocks
                key={query}
                initialBlocks={blockPage.blocks}
                initialHasMore={blockPage.hasMore}
                myChannels={myChannels}
                showConnect={!!session?.me}
                loadMore={searchBlocks.bind(null, query)}
              />
            )}
          </section>
        </>
      )}
    </main>
  );
}
