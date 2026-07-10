'use client';

import { PaginatedList } from '@/components/paginated-list';
import { FeedRow } from '@/components/feed-row';
import { getFeed } from '@/app/actions/follow';
import type { Connection } from '@/lib/types';

export function PaginatedFeed({
  initialItems,
  initialHasMore,
}: {
  initialItems: Connection[];
  initialHasMore: boolean;
}) {
  return (
    <PaginatedList<Connection>
      initialItems={initialItems}
      initialHasMore={initialHasMore}
      loadMore={getFeed}
      getKey={(c) => c.documentId}
      gridClassName="flex flex-col divide-y divide-neutral-100"
      renderItem={(conn) => <FeedRow key={conn.documentId} conn={conn} />}
    />
  );
}
