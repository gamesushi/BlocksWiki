'use client';

import Link from 'next/link';
import type { Connection } from '@/lib/types';

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} 小时前`;
  return `${Math.floor(hrs / 24)} 天前`;
}

/** 动态流一条："X 把 [block 摘要 / 频道] 连结到 [频道] · 时间" */
export function FeedRow({ conn }: { conn: Connection }) {
  const target = conn.channel;
  const isChannelContent = !!conn.contentChannel;
  const contentLabel = isChannelContent
    ? conn.contentChannel!.title
    : conn.block?.excerpt || '(空白 Block)';
  const contentHref = isChannelContent
    ? `/channel/${conn.contentChannel!.slug}`
    : conn.block
      ? `/block/${conn.block.documentId}`
      : '#';

  return (
    <li className="flex items-start gap-3 py-3">
      <span className="mt-1 h-8 w-8 shrink-0 overflow-hidden rounded-full bg-neutral-100">
        {conn.block?.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={conn.block.coverImageUrl} alt="" className="h-full w-full object-cover" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-neutral-700">
          <Link href={`/user/${conn.connectorName}`} className="font-medium text-neutral-900 hover:text-neutral-500">
            {conn.connectorName}
          </Link>{' '}
          {isChannelContent ? '把频道' : '连结了'}{' '}
          <Link href={contentHref} className="text-neutral-900 underline decoration-neutral-300 hover:decoration-neutral-900">
            {contentLabel.length > 40 ? contentLabel.slice(0, 40) + '…' : contentLabel}
          </Link>
          {target && (
            <>
              {' '}到{' '}
              <Link href={`/channel/${target.slug}`} className="text-neutral-900 underline decoration-neutral-300 hover:decoration-neutral-900">
                {target.title}
              </Link>
            </>
          )}
        </p>
        <p className="mt-0.5 text-xs text-neutral-400">{timeAgo(conn.createdAt)}</p>
      </div>
    </li>
  );
}
