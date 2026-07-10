'use client';

import Link from 'next/link';
import { DisconnectButton } from '@/components/disconnect-button';
import type { Connection } from '@/lib/types';

/**
 * 频道页的一张卡片：渲染 Connection（连结者署名 + 频道主可见的 disconnect ✕）。
 * 与 BlockCard 的区别：署名是"由 X 连结"而非作者，且带解连结动作。
 */
export function ConnectionCard({
  conn,
  channelSlug,
  isOwner,
}: {
  conn: Connection;
  channelSlug: string;
  isOwner: boolean;
}) {
  // 频道套频道：内容是一个频道 → 渲染频道块（深色卡片，与 block 区分）
  if (conn.contentChannel) {
    const ch = conn.contentChannel;
    return (
      <li className="flex flex-col">
        <Link
          href={`/channel/${ch.slug}`}
          className="flex aspect-square flex-col justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-neutral-100 transition-opacity hover:opacity-90"
        >
          <span className="text-[10px] uppercase tracking-widest text-neutral-500">Channel</span>
          <span className="text-sm font-medium leading-snug">{ch.title}</span>
          <span className="text-[11px] text-neutral-400">{ch.connectionCount} blocks</span>
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-neutral-400">由 {conn.connectorName} 连结</span>
          {isOwner && <DisconnectButton connectionId={conn.documentId} channelSlug={channelSlug} />}
        </div>
      </li>
    );
  }

  if (!conn.block) return null;
  return (
    <li className="flex flex-col">
      <Link
        href={`/block/${conn.block.documentId}`}
        className="flex aspect-square flex-col rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-400"
      >
        {conn.block.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={conn.block.coverImageUrl} alt="" className="h-full w-full rounded object-cover" />
        ) : (
          <p className="line-clamp-6 text-sm leading-relaxed text-neutral-700">
            {conn.block.excerpt || '(空白 Block)'}
          </p>
        )}
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-neutral-400">
          由 {conn.connectorName} 连结 · {conn.block.connectionCount} 处引用
        </span>
        {isOwner && <DisconnectButton connectionId={conn.documentId} channelSlug={channelSlug} />}
      </div>
    </li>
  );
}
