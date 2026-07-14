/**
 * 探索页：公开频道发现，按最近活跃排序。
 * "最近活跃" = updatedAt desc —— connect 时维护 connectionCount 会 touch 频道的
 * updatedAt，等于免费拿到活跃度信号，不需要额外的 lastActiveAt 字段。
 *
 * 缩略预览避免 N+1：一次 $in 批量查询拿全部候选频道的近期边，内存分组取前 3。
 * 全局按 createdAt desc 截 120 条再分组 —— 极端情况下超大频道会挤占预览名额，
 * 小频道缩略可能为空（卡片仍显示计数），MVP 可接受。
 */
import Link from 'next/link';
import { strapiFetch, type StrapiResponse } from '@/lib/strapi';
import type { Channel, Connection } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PREVIEW_PER_CHANNEL = 3;

async function getExploreData() {
  const chQs = new URLSearchParams({
    'filters[visibility][$eq]': 'public',
    'sort[0]': 'updatedAt:desc',
    'pagination[pageSize]': '24',
    'fields[0]': 'title',
    'fields[1]': 'slug',
    'fields[2]': 'description',
    'fields[3]': 'ownerName',
    'fields[4]': 'connectionCount',
  });
  const channels = (
    await strapiFetch<StrapiResponse<Channel[]>>(`/channels?${chQs}`, {
      tags: ['explore'],
      revalidate: 120,
    })
  ).data;

  if (channels.length === 0) return { channels, previews: new Map<string, Connection[]>() };

  const connQs = new URLSearchParams({
    'sort[0]': 'createdAt:desc',
    'pagination[pageSize]': '120',
    'fields[0]': 'position',
    'populate[block][fields][0]': 'excerpt',
    'populate[block][fields][1]': 'coverImageUrl',
    'populate[channel][fields][0]': 'slug',
  });
  channels.forEach((ch, i) => {
    connQs.append(`filters[channel][documentId][$in][${i}]`, ch.documentId);
  });
  const connections = (
    await strapiFetch<StrapiResponse<Connection[]>>(`/connections?${connQs}`, {
      tags: ['explore'],
      revalidate: 120,
    })
  ).data;

  const previews = new Map<string, Connection[]>();
  for (const conn of connections) {
    const slug = conn.channel?.slug;
    if (!slug) continue;
    const list = previews.get(slug) ?? [];
    if (list.length < PREVIEW_PER_CHANNEL) {
      list.push(conn);
      previews.set(slug, list);
    }
  }
  return { channels, previews };
}

export default async function ExplorePage() {
  const { channels, previews } = await getExploreData();

  return (
    <main className="px-6 py-10">
      <header className="mb-10 flex items-baseline gap-4">
        <h1 className="text-lg font-medium tracking-tight">探索频道</h1>
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-900">← BlocksWiki</Link>
      </header>

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((ch) => {
          const items = previews.get(ch.slug) ?? [];
          return (
            <li key={ch.documentId}>
              <Link
                href={`/channel/${ch.slug}`}
                className="block rounded-lg border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-400"
              >
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((i) => {
                    const block = items[i]?.block;
                    return (
                      <div
                        key={i}
                        className="flex aspect-square items-center overflow-hidden rounded bg-neutral-50 p-1.5"
                      >
                        {block?.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={block.coverImageUrl}
                            alt=""
                            className="h-full w-full rounded-sm object-cover"
                          />
                        ) : block?.excerpt ? (
                          <p className="line-clamp-4 text-[9px] leading-tight text-neutral-500">
                            {block.excerpt}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <h2 className="truncate text-sm font-medium text-neutral-900">{ch.title}</h2>
                <p className="mt-1 text-xs text-neutral-400">
                  {ch.ownerName} · {ch.connectionCount} blocks
                </p>
                {ch.description && (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-500">
                    {ch.description}
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {channels.length === 0 && (
        <p className="text-sm text-neutral-400">还没有公开频道。</p>
      )}
    </main>
  );
}
