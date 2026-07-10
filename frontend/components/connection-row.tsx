'use client';

import Link from 'next/link';
import { DisconnectButton } from '@/components/disconnect-button';
import type { Connection } from '@/lib/types';

/** Table 视图的一行：缩略/摘要 · 连结者 · 引用数 · 添加时间。 */
export function ConnectionRow({
  conn,
  channelSlug,
  isOwner,
}: {
  conn: Connection;
  channelSlug: string;
  isOwner: boolean;
}) {
  const added = conn.createdAt ? new Date(conn.createdAt).toLocaleDateString('zh-CN') : '';

  // 频道套频道：频道块行
  if (conn.contentChannel) {
    const ch = conn.contentChannel;
    return (
      <li className="flex items-center gap-4 py-2.5">
        <Link href={`/channel/${ch.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-neutral-900 text-[8px] uppercase tracking-wide text-neutral-400">
            频道
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-neutral-800 hover:text-neutral-500">
            {ch.title}
          </span>
        </Link>
        <span className="hidden w-28 shrink-0 truncate text-xs text-neutral-400 sm:block">
          {conn.connectorName}
        </span>
        <span className="hidden w-16 shrink-0 text-right text-xs text-neutral-400 md:block">
          {ch.connectionCount} blocks
        </span>
        <span className="w-20 shrink-0 text-right text-xs text-neutral-400">{added}</span>
        {isOwner && (
          <span className="w-6 shrink-0 text-right">
            <DisconnectButton connectionId={conn.documentId} channelSlug={channelSlug} />
          </span>
        )}
      </li>
    );
  }

  if (!conn.block) return null;
  return (
    <li className="flex items-center gap-4 py-2.5">
      <Link href={`/block/${conn.block.documentId}`} className="flex min-w-0 flex-1 items-center gap-3">
        <span className="h-9 w-9 shrink-0 overflow-hidden rounded bg-neutral-100">
          {conn.block.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={conn.block.coverImageUrl} alt="" className="h-full w-full object-cover" />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-neutral-800 hover:text-neutral-500">
          {conn.block.excerpt || '(空白 Block)'}
        </span>
      </Link>
      <span className="hidden w-28 shrink-0 truncate text-xs text-neutral-400 sm:block">
        {conn.connectorName}
      </span>
      <span className="hidden w-16 shrink-0 text-right text-xs text-neutral-400 md:block">
        {conn.block.connectionCount} 引用
      </span>
      <span className="w-20 shrink-0 text-right text-xs text-neutral-400">{added}</span>
      {isOwner && (
        <span className="w-6 shrink-0 text-right">
          <DisconnectButton connectionId={conn.documentId} channelSlug={channelSlug} />
        </span>
      )}
    </li>
  );
}
