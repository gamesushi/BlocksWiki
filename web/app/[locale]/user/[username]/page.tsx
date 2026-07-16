/**
 * 用户主页：某人发布的全部 Block + 其公开 Channel。
 * 查询走反规范化平面字段 creatorName / ownerName ——
 * users-permissions 禁止对 user 关系做 filters，平面字段再次立功。
 * private 频道由后端 channel.find 覆盖自动过滤（属主本人可见）。
 */
import type { Metadata } from 'next';
import Link, { getPathname } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { getSession } from '@/app/actions/auth';
import { strapiFetch, type StrapiResponse } from '@/lib/strapi';
import { FollowButton } from '@/components/follow-button';
import type { Block, Channel } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = getPathname({ href: `/user/${username}`, locale: loc });
  }
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    alternates: { languages },
  };
}

export default async function UserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const t = await getTranslations('Common');
  const session = await getSession();

  const blocksQs = new URLSearchParams({
    'filters[creatorName][$eq]': username,
    'sort[0]': 'createdAt:desc',
    'pagination[pageSize]': '48',
    'fields[0]': 'excerpt',
    'fields[1]': 'coverImageUrl',
    'fields[2]': 'blockType',
    'fields[3]': 'connectionCount',
  });
  const channelsQs = new URLSearchParams({
    'filters[ownerName][$eq]': username,
    'sort[0]': 'createdAt:desc',
    'pagination[pageSize]': '50',
    'fields[0]': 'title',
    'fields[1]': 'slug',
    'fields[2]': 'visibility',
  });

  const userQs = new URLSearchParams({
    'filters[username][$eq]': username,
    'fields[0]': 'username',
    'fields[1]': 'followerCount',
  });

  const [blocksRes, channelsRes, usersRes] = await Promise.all([
    strapiFetch<StrapiResponse<Block[]>>(`/blocks?${blocksQs}`),
    strapiFetch<StrapiResponse<Channel[]>>(`/channels?${channelsQs}`),
    strapiFetch<{ id: number; username: string; followerCount?: number }[]>(`/users?${userQs}`).catch(() => []),
  ]);
  const blocks = blocksRes.data;
  const channels = channelsRes.data;
  const profile = Array.isArray(usersRes) ? usersRes[0] : undefined;

  if (blocks.length === 0 && channels.length === 0 && !profile) notFound();

  const me = session?.me;
  const isSelf = me?.username === username;
  const iFollow = !!session?.following.includes(username);

  return (
    <main className="px-6 py-10">
      <header className="mb-10">
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-900">{t('backHome')}</Link>
        <div className="mt-4 flex items-center gap-3">
          <h1 className="text-2xl font-medium tracking-tight">{username}</h1>
          {me && !isSelf && (
            <FollowButton kind="user" username={username} initialFollowing={iFollow} />
          )}
        </div>
        <p className="mt-1 text-sm text-neutral-400">
          {blocks.length} blocks · {channels.length} channels · {profile?.followerCount ?? 0} {t('followers')}
        </p>
      </header>

      {channels.length > 0 && (
        <section className="mb-10 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs uppercase tracking-widest text-neutral-400">Channels</span>
          {channels.map((ch) => (
            <Link
              key={ch.documentId}
              href={`/channel/${ch.slug}`}
              className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
            >
              {ch.title}
              {ch.visibility === 'private' && <span className="ml-1 text-neutral-300">🔒</span>}
            </Link>
          ))}
        </section>
      )}

      <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {blocks.map((block) => (
          <li key={block.documentId} className="flex flex-col">
            <Link
              href={`/block/${block.documentId}`}
              className="flex aspect-square flex-col rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-400"
            >
              {block.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={block.coverImageUrl} alt="" className="h-full w-full rounded object-cover" />
              ) : (
                <p className="line-clamp-6 text-sm leading-relaxed text-neutral-700">
                  {block.excerpt || t('emptyBlock')}
                </p>
              )}
            </Link>
            <p className="mt-2 text-[11px] text-neutral-400">{block.connectionCount} {t('references')}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
