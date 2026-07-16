'use client';

import { Fragment, useState, useTransition, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

export type Page<T> = { items: T[]; hasMore: boolean; page: number };

/** renderItem 的可选第三参：拖拽手柄，reorderable 时注入，item 根元素自行 spread。 */
export type DragHandlers = {
  draggable: true;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isDragging: boolean;
};

/**
 * 通用"加载更多"网格：独占分页 state、去重、加载按钮，可选拖拽排序。
 * 类型无关，渲染逻辑由 renderItem 注入 —— Feed 与频道页共用同一套加载机制，
 * 各自只提供卡片渲染与 loadMore 适配（{blocks}/{connections} → {items}）。
 *
 * 拖拽排序：只在"当前已加载的 items"内重排（跨分页安全 —— onReorder 只拿到
 * 这批 item 的新顺序，服务端在这批 item 已有的 position 数值池内重新分配，
 * 不触碰未加载 item 的 position，全局排序不受影响）。落地失败则回滚本地顺序。
 */
export function PaginatedList<T>({
  initialItems,
  initialHasMore,
  loadMore,
  getKey,
  renderItem,
  leading,
  gridClassName = 'grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4',
  reorderable = false,
  onReorder,
  hiddenIds,
}: {
  initialItems: T[];
  initialHasMore: boolean;
  loadMore: (page: number) => Promise<Page<T>>;
  getKey: (item: T) => string;
  renderItem: (item: T, index: number, drag?: DragHandlers) => ReactNode;
  /** 固定渲染在网格首格（不参与分页），如 Are.na 的"+"添加磁贴 */
  leading?: ReactNode;
  gridClassName?: string;
  /** 开启拖拽排序（仅调用方确认当前用户有权限时传 true） */
  reorderable?: boolean;
  /** 拖拽落地后持久化；返回 false 触发本地回滚 */
  onReorder?: (orderedIds: string[]) => Promise<boolean>;
  /**
   * 视觉隐藏这些 key（不从 items state 里删除，分页/拖拽的 index 数学不受影响）。
   * 用于批量操作后立即给出正确反馈，不依赖 router.refresh() 与服务端缓存
   * 失效之间的时序（updateTag 的失效对同一动作发起的 refresh 请求不保证已生效，
   * 实测批量 disconnect 后 router.refresh() 偶发仍读到失效前的缓存，二次刷新才对；
   * 本地隐藏彻底绕开这个不确定性）。
   */
  hiddenIds?: Set<string>;
}) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('Common');

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

  const makeDragHandlers = (index: number): DragHandlers | undefined => {
    if (!reorderable) return undefined;
    return {
      draggable: true,
      onDragStart: (e) => {
        setDraggingIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // 拖拽源 index 存进 dataTransfer 本身，不依赖 React state：
        // dragstart 触发的 setState 是否已在 drop 触发前提交是不确定的
        // （React 批量更新不与原生 DnD 事件时序同步），state 只用于
        // isDragging 视觉效果，核心排序逻辑必须从事件负载里读。
        e.dataTransfer.setData('text/plain', String(index));
      },
      onDragOver: (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      },
      onDrop: (e) => {
        e.preventDefault();
        const raw = e.dataTransfer.getData('text/plain');
        const from = raw === '' ? NaN : Number(raw);
        setDraggingIndex(null);
        if (!Number.isInteger(from) || from === index || from < 0 || from >= items.length) return;

        const previous = items;
        const next = [...items];
        const [moved] = next.splice(from, 1);
        next.splice(index, 0, moved);
        setItems(next);

        if (onReorder) {
          startTransition(async () => {
            const ok = await onReorder(next.map(getKey));
            if (!ok) setItems(previous);
          });
        }
      },
      onDragEnd: () => setDraggingIndex(null),
      isDragging: draggingIndex === index,
    };
  };

  return (
    <>
      <ul className={gridClassName}>
        {leading != null && <Fragment key="__leading">{leading}</Fragment>}
        {items.map((it, i) => (hiddenIds?.has(getKey(it)) ? null : renderItem(it, i, makeDragHandlers(i))))}
      </ul>

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isPending}
            className="rounded-full border border-neutral-300 px-6 py-2 text-sm text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-40"
          >
            {isPending ? t('loading') : t('loadMore')}
          </button>
        </div>
      )}
    </>
  );
}
