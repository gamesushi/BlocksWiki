import Link from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { RenderBlocks } from '@/lib/render-blocks';
import { sourceHost } from '@/lib/markdown';
import type { ResolvedItem } from '@/app/actions/wiki';

/**
 * 渲染 Wiki 页的有序 items。
 * text → 编辑性散文；block → 内嵌完整 Block 内容 + 溯源链接；channel → 频道卡片。
 * 引用失效（已删除 / private 无权）→ 占位符，不报错。
 */
export function WikiContent({ items }: { items: ResolvedItem[] }) {
  const t = useTranslations('Wiki');
  const c = useTranslations('Common');
  return (
    <div className="space-y-8">
      {items.map((item, i) => {
        if (item.type === 'text') {
          return (
            <div key={i} className="prose-neutral max-w-none">
              <RenderBlocks content={item.content} />
            </div>
          );
        }

        if (item.type === 'block') {
          if (!item.block) {
            return (
              <p key={i} className="rounded-lg border border-dashed border-base-300 px-4 py-3 text-xs text-base-content/50">
                {t('removedBlockRef')}
              </p>
            );
          }
          return (
            <figure key={i} className="bw-card p-5">
              {item.note && (
                <figcaption className="mb-3 bw-sep">
                  {item.note}
                </figcaption>
              )}
              <RenderBlocks content={item.block.content} />
              <Link
                href={`/block/${item.block.documentId}`}
                className="mt-4 inline-block text-xs bw-muted hover:text-base-content"
              >
                {t('blockLink', { name: item.block.creatorName, count: item.block.connectionCount })}
              </Link>
              {item.block.sourceUrl &&
                (() => {
                  const h = sourceHost(item.block.sourceUrl);
                  return h ? (
                    <span className="ml-2 text-xs bw-muted">
                      · {c('source')}{' '}
                      <a
                        href={item.block.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-base-content"
                      >
                        {h}
                      </a>
                    </span>
                  ) : null;
                })()}
            </figure>
          );
        }

        // channel
        if (!item.channel) {
          return (
            <p key={i} className="rounded-lg border border-dashed border-base-300 px-4 py-3 text-xs text-base-content/50">
              {t('removedChannelRef')}
            </p>
          );
        }
        return (
          <Link
            key={i}
            href={`/channel/${item.channel.slug}`}
            className="bw-card bw-card-hover flex items-center justify-between"
          >
            <span>
              <span className="text-sm font-medium text-base-content">{item.channel.title}</span>
              {item.note && <span className="ml-2 text-xs bw-muted">{item.note}</span>}
              <span className="mt-0.5 block text-xs bw-muted">
                {item.channel.ownerName} · {item.channel.connectionCount} blocks
              </span>
            </span>
            <span className="text-xs text-base-content/40">{t('channelArrow')}</span>
          </Link>
        );
      })}
    </div>
  );
}
