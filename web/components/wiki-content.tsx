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
              <p key={i} className="rounded-lg border border-dashed border-neutral-200 px-4 py-3 text-xs text-neutral-400">
                {t('removedBlockRef')}
              </p>
            );
          }
          return (
            <figure key={i} className="rounded-lg border border-neutral-200 bg-white p-5">
              {item.note && (
                <figcaption className="mb-3 text-xs font-medium uppercase tracking-widest text-neutral-400">
                  {item.note}
                </figcaption>
              )}
              <RenderBlocks content={item.block.content} />
              <Link
                href={`/block/${item.block.documentId}`}
                className="mt-4 inline-block text-xs text-neutral-400 hover:text-neutral-900"
              >
                {t('blockLink', { name: item.block.creatorName, count: item.block.connectionCount })}
              </Link>
              {item.block.sourceUrl &&
                (() => {
                  const h = sourceHost(item.block.sourceUrl);
                  return h ? (
                    <span className="ml-2 text-xs text-neutral-400">
                      · {c('source')}{' '}
                      <a
                        href={item.block.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-neutral-900"
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
            <p key={i} className="rounded-lg border border-dashed border-neutral-200 px-4 py-3 text-xs text-neutral-400">
              {t('removedChannelRef')}
            </p>
          );
        }
        return (
          <Link
            key={i}
            href={`/channel/${item.channel.slug}`}
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-5 py-4 transition-colors hover:border-neutral-400"
          >
            <span>
              <span className="text-sm font-medium text-neutral-900">{item.channel.title}</span>
              {item.note && <span className="ml-2 text-xs text-neutral-400">{item.note}</span>}
              <span className="mt-0.5 block text-xs text-neutral-400">
                {item.channel.ownerName} · {item.channel.connectionCount} blocks
              </span>
            </span>
            <span className="text-xs text-neutral-400">{t('channelArrow')}</span>
          </Link>
        );
      })}
    </div>
  );
}
