'use client';

import type { ReactNode } from 'react';
import { ConnectionCard } from '@/components/connection-card';
import { ConnectionRow } from '@/components/connection-row';
import { PaginatedList } from '@/components/paginated-list';
import type { Connection } from '@/lib/types';

export type ConnectionPage = { connections: Connection[]; hasMore: boolean; page: number };

/**
 * 频道页的边网格。薄封装：把 {connections} 适配成 {items}，注入 ConnectionCard。
 * disconnect 后本地页不自动缩短（server action 已 updateTag 失效缓存，
 * 下次进入频道即刷新）—— MVP 可接受，避免复杂的乐观删除同步。
 * 拖拽排序、多选批量操作仅 Grid 视图，二者互斥由调用方（页面层）保证不同时开启。
 */
export function PaginatedConnections({
  initialConnections,
  initialHasMore,
  channelSlug,
  isOwner,
  loadMore,
  leading,
  variant = 'grid',
  reorderable = false,
  onReorder,
  selectMode = false,
  selectedIds,
  onToggleSelect,
  hiddenIds,
}: {
  initialConnections: Connection[];
  initialHasMore: boolean;
  channelSlug: string;
  isOwner: boolean;
  loadMore: (page: number) => Promise<ConnectionPage>;
  leading?: ReactNode;
  variant?: 'grid' | 'table' | 'read';
  reorderable?: boolean;
  onReorder?: (orderedIds: string[]) => Promise<boolean>;
  /** 多选模式：Grid 视图内点击卡片切换选中，而非导航 */
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (conn: Connection) => void;
  /** 批量操作后立即视觉隐藏，不等待缓存失效传播 */
  hiddenIds?: Set<string>;
}) {
  const isTable = variant === 'table';
  return (
    <PaginatedList<Connection>
      initialItems={initialConnections}
      initialHasMore={initialHasMore}
      leading={isTable || selectMode ? undefined : leading}
      reorderable={!isTable && reorderable}
      onReorder={onReorder}
      hiddenIds={hiddenIds}
      gridClassName={
        isTable
          ? 'flex flex-col divide-y divide-neutral-100 border-t border-neutral-100'
          : undefined
      }
      loadMore={async (page) => {
        const r = await loadMore(page);
        return { items: r.connections, hasMore: r.hasMore, page: r.page };
      }}
      getKey={(c) => c.documentId}
      renderItem={(conn, _i, drag) =>
        isTable ? (
          <ConnectionRow key={conn.documentId} conn={conn} channelSlug={channelSlug} isOwner={isOwner} />
        ) : (
          <ConnectionCard
            key={conn.documentId}
            conn={conn}
            channelSlug={channelSlug}
            isOwner={isOwner}
            drag={drag}
            selectMode={selectMode}
            selected={selectedIds?.has(conn.documentId)}
            onToggleSelect={() => onToggleSelect?.(conn)}
          />
        )
      }
    />
  );
}
