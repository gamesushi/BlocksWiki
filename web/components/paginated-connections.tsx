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
 */
export function PaginatedConnections({
  initialConnections,
  initialHasMore,
  channelSlug,
  isOwner,
  loadMore,
  leading,
  variant = 'grid',
}: {
  initialConnections: Connection[];
  initialHasMore: boolean;
  channelSlug: string;
  isOwner: boolean;
  loadMore: (page: number) => Promise<ConnectionPage>;
  leading?: ReactNode;
  variant?: 'grid' | 'table';
}) {
  const isTable = variant === 'table';
  return (
    <PaginatedList<Connection>
      initialItems={initialConnections}
      initialHasMore={initialHasMore}
      leading={isTable ? undefined : leading}
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
      renderItem={(conn) =>
        isTable ? (
          <ConnectionRow key={conn.documentId} conn={conn} channelSlug={channelSlug} isOwner={isOwner} />
        ) : (
          <ConnectionCard key={conn.documentId} conn={conn} channelSlug={channelSlug} isOwner={isOwner} />
        )
      }
    />
  );
}
