'use client';

import Link from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import type { Connection } from '@/lib/types';
import { TimeAgo } from '@/components/time-ago';

/** 动态流一条："X 把 [block 摘要 / 频道] 连结到 [频道] · 时间" */
export function FeedRow({ conn }: { conn: Connection }) {
  const t = useTranslations('Common');
  const tf = useTranslations('Feed');
  const target = conn.channel;
  const isChannelContent = !!conn.contentChannel;
  const contentLabel = isChannelContent
    ? conn.contentChannel!.title
    : conn.block?.excerpt || t('emptyBlock');
  const contentHref = isChannelContent
    ? `/channel/${conn.contentChannel!.slug}`
    : conn.block
      ? `/block/${conn.block.documentId}`
      : '#';

  return (
    <li className="flex items-start gap-3 py-3">
      <span className="mt-1 h-8 w-8 shrink-0 overflow-hidden rounded-full bg-base-200">
        {conn.block?.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={conn.block.coverImageUrl} alt="" className="h-full w-full object-cover" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-base-content/80">
          <Link href={`/user/${conn.connectorName}`} className="font-medium text-base-content hover:text-primary">
            {conn.connectorName}
          </Link>{' '}
          {isChannelContent ? tf('connectedChannel') : tf('connected')}{' '}
          <Link href={contentHref} className="text-base-content underline decoration-base-300/60 hover:decoration-base-content">
            {contentLabel.length > 40 ? contentLabel.slice(0, 40) + '…' : contentLabel}
          </Link>
          {target && (
            <>
              {' '}{tf('to')}{' '}
              <Link href={`/channel/${target.slug}`} className="text-base-content underline decoration-base-300/60 hover:decoration-base-content">
                {target.title}
              </Link>
            </>
          )}
        </p>
        <p className="mt-0.5 text-xs bw-muted"><TimeAgo date={conn.createdAt} /></p>
      </div>
    </li>
  );
}
