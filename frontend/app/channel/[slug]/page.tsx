/**
 * Channel 网格页（服务端组件）。
 * 一次请求拿到 Channel + Connections + Block 平面预览字段：
 * 卡片只消费反规范化的 excerpt / coverImageUrl，不 populate content JSON（防 N+1 与大 payload）。
 * 缓存：tag `channel:${slug}`，connect/disconnect 时 revalidateTag 精确失效。
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/app/actions/auth';
import { deleteChannel } from '@/app/actions/channels';
import { loadChannelConnections, getChannelAppearances, reorderChannelConnections } from '@/app/actions/channel';
import { strapiFetch, type StrapiResponse } from '@/lib/strapi';
import { DeleteButton } from '@/components/delete-button';
import { ChannelGrid } from '@/components/channel-grid';
import { CollaboratorsPanel } from '@/components/collaborators-panel';
import { AddBlockTile } from '@/components/add-block-tile';
import { ViewToggle } from '@/components/view-toggle';
import { ChannelConnectButton } from '@/components/channel-connect-button';
import { FollowButton } from '@/components/follow-button';
import type { Channel } from '@/lib/types';

export const dynamic = 'force-dynamic';

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} 小时前`;
  const days = Math.floor(hrs / 24);
  return `${days} 天前`;
}

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { slug } = await params;
  const view = (await searchParams).view === 'table' ? 'table' : 'grid';
  const [channelRes, session] = await Promise.all([
    strapiFetch<StrapiResponse<Channel[]>>(
      `/channels?filters[slug][$eq]=${encodeURIComponent(slug)}`,
      { tags: [`channel:${slug}`], revalidate: 300 }
    ),
    getSession(),
  ]);
  const channel = channelRes.data[0];
  if (!channel) notFound();

  const [firstPage, appearances] = await Promise.all([
    loadChannelConnections(channel.documentId, slug, 1),
    getChannelAppearances(channel.documentId),
  ]);
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
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="mb-12">
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
                label="删除频道"
                confirmLabel="确认删除？Block 本体不受影响"
                action={deleteChannel.bind(null, channel.documentId, slug)}
                redirectTo="/"
              />
            )}
          </span>
        </div>
        <p className="mt-2 text-sm text-neutral-400">
          <Link href={`/user/${channel.ownerName}`} className="hover:text-neutral-900">
            {channel.ownerName}
          </Link>{' '}
          · {channel.connectionCount} blocks · {channel.followerCount ?? 0} 关注者 · {channel.visibility}
        </p>
        {channel.description && (
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-neutral-500">
            {channel.description}
          </p>
        )}

        {/* Info + 视图切换（对齐 Are.na 的 Started/Modified/Length + Grid/Table） */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-100 pt-4">
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-neutral-400">
            <span>创建于 {timeAgo(channel.createdAt)}</span>
            <span>更新于 {timeAgo(channel.updatedAt)}</span>
            <span>Length {channel.connectionCount}</span>
          </dl>
          <ViewToggle slug={slug} current={view} />
        </div>

        {appearances.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-neutral-300">出现在</span>
            {appearances.map((ch) => (
              <Link
                key={ch.documentId}
                href={`/channel/${ch.slug}`}
                className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
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

      {firstPage.connections.length === 0 && !canConnect ? (
        <p className="text-sm text-neutral-400">这个频道还没有连结任何 Block。</p>
      ) : (
        <ChannelGrid
          channelDocumentId={channel.documentId}
          channelSlug={slug}
          isOwner={isOwner}
          canSelect={!!me}
          variant={view}
          initialConnections={firstPage.connections}
          initialHasMore={firstPage.hasMore}
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
