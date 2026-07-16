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
    <li className="group flex flex-col">
      <Link
        href={`/block/${block.documentId}`}
        className="card card-compact aspect-square overflow-hidden border border-base-300 bg-base-100 shadow-sm transition-all duration-250 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/30"
      >
        {/* 卡片顶部装饰线 — hover 时从透明渐入主色 */}
        <span className="block h-0.5 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

        {block.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={block.coverImageUrl}
            alt=""
            className="h-[calc(100%-3px)] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="card-body h-[calc(100%-3px)] items-start justify-center overflow-hidden p-5 sm:p-6">
            <p className="line-clamp-6 text-sm leading-relaxed text-base-content/75">
              {block.excerpt || t('emptyBlock')}
            </p>
          </div>
        )}
      </Link>

      {/* 元信息行 */}
      <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
        <span className="min-w-0 flex-1 truncate text-[11px] leading-relaxed text-base-content/45">
          <Link
            href={`/user/${block.creatorName}`}
            className="font-medium transition-colors hover:text-primary"
          >
            {block.creatorName}
          </Link>{' '}
          <span className="text-base-content/30">·</span>{' '}
          <span>{block.connectionCount} {t('references')}</span>
          {block.commentCount > 0 && (
            <> <span className="text-base-content/30">·</span> <span>{block.commentCount} {t('comments')}</span></>
          )}
          {srcHost && (
            <>
              {' '}
              <span className="text-base-content/30">·</span> {t('source')}{' '}
              <a
                href={block.sourceUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-primary"
              >
                ↗ {srcHost}
              </a>
            </>
          )}
        </span>

        {showConnect && (
          <ConnectButton blockId={block.documentId} myChannels={myChannels} />
        )}
      </div>
    </li>
  );
}
