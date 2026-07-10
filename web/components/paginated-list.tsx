'use client';

import { Fragment, useState, useTransition, type ReactNode } from 'react';

export type Page<T> = { items: T[]; hasMore: boolean; page: number };

/**
 * 通用"加载更多"网格：独占分页 state、去重、加载按钮。
 * 类型无关，渲染逻辑由 renderItem 注入 —— Feed 与频道页共用同一套加载机制，
 * 各自只提供卡片渲染与 loadMore 适配（{blocks}/{connections} → {items}）。
 */
export function PaginatedList<T>({
  initialItems,
  initialHasMore,
  loadMore,
  getKey,
  renderItem,
  leading,
  gridClassName = 'grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4',
}: {
  initialItems: T[];
  initialHasMore: boolean;
  loadMore: (page: number) => Promise<Page<T>>;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** 固定渲染在网格首格（不参与分页），如 Are.na 的"+"添加磁贴 */
  leading?: ReactNode;
  gridClassName?: string;
}) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();

  const onLoadMore = () => {
    startTransition(async () => {
      const next = await loadMore(page + 1);
      // 按 key 去重：并发写入可能让相邻页出现重叠
      setItems((prev) => {
        const seen = new Set(prev.map(getKey));
        return [...prev, ...next.items.filter((it) => !seen.has(getKey(it)))];
      });
      setPage(next.page);
      setHasMore(next.hasMore);
    });
  };

  return (
    <>
      <ul className={gridClassName}>
        {leading != null && <Fragment key="__leading">{leading}</Fragment>}
        {items.map((it) => renderItem(it))}
      </ul>

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isPending}
            className="rounded-full border border-neutral-300 px-6 py-2 text-sm text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-40"
          >
            {isPending ? '加载中…' : '加载更多'}
          </button>
        </div>
      )}
    </>
  );
}
