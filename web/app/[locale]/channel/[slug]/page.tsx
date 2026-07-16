/**
 * Channel 页（服务端组件），三种视图：
 *  - grid / table：卡片网格（消费反规范化 excerpt / coverImageUrl，不 populate content JSON，防 N+1）。
 *  - read：把频道当一篇可连续阅读的文章，按 position 升序流式渲染每个 block 的完整正文（ChannelReader）。
 * 缓存：tag `channel:${slug}`，connect/disconnect 时 revalidateTag 精确失效。
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link, { getPathname } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { getSession } from '@/app/actions/auth';
import { deleteChannel } from '@/app/actions/channels';
import {
  loadChannelConnections,
  loadChannelBlocksForReading,
  getChannelAppearances,
  reorderChannelConnections,
  type ConnectionPage,
  type ChannelReadBlock,
} from '@/app/actions/channel';
import { strapiFetch, type StrapiResponse } from '@/lib/strapi';
import { DeleteButton } from '@/components/delete-button';
import { EditChannelForm } from '@/components/edit-channel-form';
import { ChannelGrid } from '@/components/channel-grid';
import { ChannelReader } from '@/components/channel-reader';
import { CollaboratorsPanel } from '@/components/collaborators-panel';
import { AddBlockTile } from '@/components/add-block-tile';
import { ViewToggle } from '@/components/view-toggle';
import { ChannelConnectButton } from '@/components/channel-connect-button';
import { FollowButton } from '@/components/follow-button';
import { TimeAgo } from '@/components/time-ago';
import type { Block, Channel } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = getPathname({ href: `/channel/${slug}`, locale: loc });
  }
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    alternates: { languages },
  };
}

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations('Channel');
  const tc = await getTranslations('Common');
  const viewParam = (await searchParams).view;
  const view: 'grid' | 'table' | 'read' =
    viewParam === 'table' ? 'table' : viewParam === 'read' ? 'read' : 'grid';
  const isReadView = view === 'read';
  const [channelRes, session] = await Promise.all([
    strapiFetch<StrapiResponse<Channel[]>>(
      `/channels?filters[slug][$eq]=${encodeURIComponent(slug)}`,
      { tags: [`channel:${slug}`], revalidate: 300 }
    ),
    getSession(),
  ]);
  const channel = channelRes.data[0];
  if (!channel) notFound();

  const appearances = await getChannelAppearances(channel.documentId);

  // 阅读视图：按 position 顺序取完整正文；其余视图：取卡片网格首页。
  let firstPage: ConnectionPage | null = null;
  let readBlocks: ChannelReadBlock[] | null = null;
  if (isReadView) {
    readBlocks = await loadChannelBlocksForReading(channel.documentId, slug);
  } else {
    firstPage = await loadChannelConnections(channel.documentId, slug, 1);
  }
  // username 全站唯一，够用作 MVP 的属主判定（owner 关系对匿名请求会被 sanitize）
  const me = session?.me;
  const myChannels = session?.channels ?? [];
  const isOwner = !!me && me.username === channel.ownerName;
  const isCollaborator = !!me && (channel.collaboratorNames ?? []).includes(me.username);
  // 连结权：public 任何登录用户；closed/private 属主或协作者
  const canConnect = !!me && (channel.visibility === 'public' || isOwner || isCollaborator);
  // 排序权：只有属主/协作者可调整全频道展示顺序（不对任意 public 连结者开放，避免误改他人策展的顺序）
  const canReorder = isOwner || isCollaborator;

  return (
    <main className="px-6 py-16">
      <header className="mb-12">
        {/* 面包屑 —— 对齐 Are.na: BlocksWiki / channel */}
        <nav className="mb-3 text-sm bw-muted">
          <Link href="/" className="hover:text-base-content/70">BlocksWiki</Link>
          <span className="mx-2">/</span>
          <span className="text-base-content/70">{channel.title}</span>
        </nav>

        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-medium tracking-tight">{channel.title}</h1>
          <span className="flex shrink-0 items-center gap-2">
            {me && !isOwner && (
              <FollowButton
                kind="channel"
                channelId={channel.documentId}
                slug={slug}
                initialFollowing={session?.followedChannelIds.includes(channel.documentId) ?? false}
              />
            )}
            {me && <ChannelConnectButton channelId={channel.documentId} myChannels={myChannels} />}
            {isOwner && (
              <DeleteButton
                label={t('delete')}
                confirmLabel={t('confirmDelete')}
                action={deleteChannel.bind(null, channel.documentId, slug)}
                redirectTo="/"
              />
            )}
          </span>
        </div>
        {isOwner && (
          <div className="mt-4">
            <EditChannelForm
              documentId={channel.documentId}
              slug={slug}
              title={channel.title}
              description={channel.description}
              visibility={channel.visibility}
            />
          </div>
        )}
        <p className="mt-2 text-sm bw-muted">
          <Link href={`/user/${channel.ownerName}`} className="hover:text-base-content">
            {channel.ownerName}
          </Link>{' '}
          · {channel.connectionCount} blocks · {channel.followerCount ?? 0} {tc('followers')} · {channel.visibility}
        </p>
        {channel.description && (
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-base-content/60">
            {channel.description}
          </p>
        )}

        {/* Info + 视图切换（对齐 Are.na 的 Started/Modified/Length + Grid/Table） */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-base-300/60 pt-4">
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs bw-muted">
            <span>{tc('createdOn')} <TimeAgo date={channel.createdAt} /></span>
            <span>{tc('updatedOn')} <TimeAgo date={channel.updatedAt} /></span>
            <span>Length {channel.connectionCount}</span>
          </dl>
          <ViewToggle slug={slug} current={view} />
        </div>

        {appearances.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="bw-sep">{t('appearsIn')}</span>
            {appearances.map((ch) => (
              <Link
                key={ch.documentId}
                href={`/channel/${ch.slug}`}
                className="bw-badge"
              >
                {ch.title}
              </Link>
            ))}
          </div>
        )}
      </header>

      {isOwner && (
        <CollaboratorsPanel
          channelId={channel.documentId}
          channelSlug={slug}
          initialNames={channel.collaboratorNames ?? []}
          visibility={channel.visibility}
        />
      )}

      {isReadView ? (
        <ChannelReader blocks={readBlocks ?? []} />
      ) : firstPage!.connections.length === 0 && !canConnect ? (
        <p className="text-sm bw-muted">{t('empty')}</p>
      ) : (
        <ChannelGrid
          channelDocumentId={channel.documentId}
          channelSlug={slug}
          isOwner={isOwner}
          canSelect={!!me}
          variant={view}
          initialConnections={firstPage!.connections}
          initialHasMore={firstPage!.hasMore}
          loadMore={loadChannelConnections.bind(null, channel.documentId, slug)}
          reorderable={canReorder}
          onReorder={reorderChannelConnections.bind(null, channel.documentId, slug)}
          myChannels={myChannels}
          leading={
            canConnect ? (
              <AddBlockTile channelId={channel.documentId} channelSlug={slug} />
            ) : undefined
          }
        />
      )}
    </main>
  );
}
