import Link from '@/i18n/navigation';
import { RenderBlocks } from '@/lib/render-blocks';
import type { Block } from '@/lib/types';
import type { ChannelReadBlock } from '@/app/actions/channel';
import { ReadNav } from '@/components/read-nav';

/**
 * 频道"阅读视图"（服务端组件，零客户端 JS）。
 * 把频道下的 block 按 position 顺序流式渲染成一篇可连续阅读的文章：
 *  - 每个 block = 一个段落/小节，用 RenderBlocks 渲染其完整正文（含内联互链 <a>）。
 *  - 块间细分隔线；hover 段首显示 § 链接到该 block 的独立页，便于跳转/复用发现。
 *  - 底部 ReadNav 提供「上一段 / 下一段」导航（客户端组件）。
 * 数据层零改动——只是换一种方式消费既有的 block→channel 边。
 */
export function ChannelReader({ blocks }: { blocks: ChannelReadBlock[] }) {
  if (blocks.length === 0) {
    return <p className="mx-auto max-w-2xl text-sm text-neutral-400">这个频道还没有 block。</p>;
  }
  const ids = blocks.map((b) => b.block.documentId).filter(Boolean) as string[];
  return (
    <>
      <article className="mx-auto max-w-2xl pb-24">
        {blocks.map(({ block }, i) => {
        const id = block.documentId;
        const isFirst = i === 0;
        return (
          <section
            key={id ?? i}
            id={id ? `block-${id}` : undefined}
            className={
              'group relative scroll-mt-24 ' +
              (isFirst ? 'pt-2' : 'mt-8 border-t border-neutral-100 pt-8')
            }
          >
            {id && (
              <Link
                href={`/block/${id}`}
                className="absolute -left-6 top-8 hidden text-neutral-300 transition-colors hover:text-neutral-900 group-hover:inline"
                title="打开这个 block"
                aria-label="打开这个 block"
              >
                §
              </Link>
            )}
            {block.content ? (
              <RenderBlocks content={block.content} />
            ) : block.coverImageUrl ? (
              // 极少数仅有封面的图片块兜底
              // eslint-disable-next-line @next/next/no-img-element
              <img src={block.coverImageUrl} alt={block.excerpt || ''} className="w-full rounded" />
            ) : null}
          </section>
        );
      })}
      </article>
      <ReadNav ids={ids} />
    </>
  );
}
