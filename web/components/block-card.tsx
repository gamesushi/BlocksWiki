'use client';

import Link from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ConnectButton } from '@/components/connect-button';
import { sourceHost } from '@/lib/markdown';
import type { Block, Channel } from '@/lib/types';

export type MyChannel = Pick<Channel, 'documentId' | 'title' | 'slug'>;

export function BlockCard({
  block,
  myChannels,
  showConnect,
}: {
  block: Block;
  myChannels: MyChannel[];
  showConnect: boolean;
}) {
  const srcHost = block.sourceUrl ? sourceHost(block.sourceUrl) : null;
  const t = useTranslations('Common');
  return (
    <li className="flex flex-col">
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
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-neutral-400">
          <Link href={`/user/${block.creatorName}`} className="hover:text-neutral-900">
            {block.creatorName}
          </Link>{' '}
          · {block.connectionCount} {t('references')}
          {block.commentCount > 0 && <> · {block.commentCount} {t('comments')}</>}
          {srcHost && (
            <>
              {' · '}{t('source')}{' '}
              <a
                href={block.sourceUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-900"
              >
                ↗ {srcHost}
              </a>
            </>
          )}
        </span>
        {showConnect && <ConnectButton blockId={block.documentId} myChannels={myChannels} />}
      </div>
    </li>
  );
}
