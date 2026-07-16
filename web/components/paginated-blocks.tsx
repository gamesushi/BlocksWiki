'use client';

import { BlockCard, type MyChannel } from '@/components/block-card';
import { PaginatedList } from '@/components/paginated-list';
import type { Block } from '@/lib/types';

export type LoadMoreResult = { blocks: Block[]; hasMore: boolean; page: number };

/**
 * Feed / 搜索的 Block 网格。薄封装：把 {blocks} 适配成 PaginatedList 的 {items}，
 * 注入 BlockCard 渲染。初始 Block 由服务端渲染（保 SSR 首屏）。
 */
export function PaginatedBlocks({
  initialBlocks,
  initialHasMore,
  myChannels,
  showConnect,
  loadMore,
  gridClassName,
}: {
  initialBlocks: Block[];
  initialHasMore: boolean;
  myChannels: MyChannel[];
  showConnect: boolean;
  loadMore: (page: number) => Promise<LoadMoreResult>;
  gridClassName?: string;
}) {
  return (
    <PaginatedList<Block>
      initialItems={initialBlocks}
      initialHasMore={initialHasMore}
      gridClassName={gridClassName}
      loadMore={async (page) => {
        const r = await loadMore(page);
        return { items: r.blocks, hasMore: r.hasMore, page: r.page };
      }}
      getKey={(b) => b.documentId}
      renderItem={(block) => (
        <BlockCard
          key={block.documentId}
          block={block}
          myChannels={myChannels}
          showConnect={showConnect}
        />
      )}
    />
  );
}
