'use client';

/**
 * 频道网格的客户端外壳：拥有"多选模式"状态，串起 PaginatedConnections、
 * 悬浮批量操作条、BatchConnectPicker。拖拽排序与多选互斥（选择时关闭拖拽）。
 * "选择"入口对任意登录用户开放（批量连结到其他频道不需要本频道的特殊权限，
 * 权限由目标频道各自校验）；"批量移除"仅频道属主可见（避免非属主对他人添加的
 * 内容发起部分失败、语义不清的批量操作）。
 */
import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { PaginatedConnections, type ConnectionPage } from '@/components/paginated-connections';
import { BatchConnectPicker } from '@/components/batch-connect-picker';
import { batchRemoveFromChannel, type SelectedItem } from '@/app/actions/channel';
import type { Connection } from '@/lib/types';

type Pick = { documentId: string; title: string; slug: string };

export function ChannelGrid({
  channelDocumentId,
  channelSlug,
  isOwner,
  canSelect,
  variant,
  initialConnections,
  initialHasMore,
  loadMore,
  reorderable,
  onReorder,
  leading,
  myChannels,
}: {
  channelDocumentId: string;
  channelSlug: string;
  isOwner: boolean;
  canSelect: boolean;
  variant: 'grid' | 'table' | 'read';
  initialConnections: Connection[];
  initialHasMore: boolean;
  loadMore: (page: number) => Promise<ConnectionPage>;
  reorderable: boolean;
  onReorder?: (orderedIds: string[]) => Promise<boolean>;
  leading?: ReactNode;
  myChannels: Pick[];
}) {
  const t = useTranslations('Common');
  const tc = useTranslations('Channel');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Map<string, SelectedItem>>(new Map());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Map());
    setPickerOpen(false);
  };

  const toggleSelect = (conn: Connection) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(conn.documentId)) {
        next.delete(conn.documentId);
      } else {
        next.set(conn.documentId, {
          connectionId: conn.documentId,
          blockId: conn.block?.documentId,
          contentChannelId: conn.contentChannel?.documentId,
        });
      }
      return next;
    });
  };

  const handleBulkRemove = () => {
    const ids = [...selected.keys()];
    startTransition(async () => {
      const result = await batchRemoveFromChannel(ids, channelSlug);
      setStatusMsg(
        tc('removedStatus', { succeeded: result.succeeded }) +
          (result.failed ? tc('removedFailed', { failed: result.failed }) : '')
      );
      // 立即本地隐藏这批卡片，不等 router.refresh() —— 实测 updateTag 的失效
      // 对紧随其后的 refresh 请求不保证已生效（偶发仍读到失效前的缓存）。
      // router.refresh() 仍保留，作为下次导航前的后台一致性兜底，非正确性依赖。
      setHiddenIds((prev) => new Set([...prev, ...ids]));
      exitSelectMode();
      router.refresh();
    });
  };

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        {variant === 'grid' && canSelect && (
          <button
            type="button"
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              selectMode
                ? 'border-neutral-900 text-neutral-900'
                : 'border-neutral-200 text-neutral-400 hover:border-neutral-900 hover:text-neutral-900'
            }`}
          >
            {selectMode ? tc('cancelSelect') : tc('select')}
          </button>
        )}
        {statusMsg && <span className="text-xs text-neutral-400">{statusMsg}</span>}
      </div>

      <PaginatedConnections
        initialConnections={initialConnections}
        initialHasMore={initialHasMore}
        channelSlug={channelSlug}
        isOwner={isOwner}
        variant={variant}
        loadMore={loadMore}
        reorderable={reorderable && !selectMode}
        onReorder={onReorder}
        selectMode={selectMode}
        selectedIds={new Set(selected.keys())}
        onToggleSelect={toggleSelect}
        leading={selectMode ? undefined : leading}
        hiddenIds={hiddenIds}
      />

      {selectMode && selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
          <div className="relative flex items-center gap-3 rounded-full border border-neutral-200 bg-white px-4 py-2 shadow-lg">
            <span className="text-xs text-neutral-500">{tc('selectedCount', { count: selected.size })}</span>
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              disabled={isPending}
              className="rounded-full bg-neutral-900 px-3 py-1 text-xs text-white disabled:opacity-40"
            >
              {tc('connectTo')}
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={handleBulkRemove}
                disabled={isPending}
                className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40"
              >
                {isPending ? t('processing') : tc('remove')}
              </button>
            )}
            <button
              type="button"
              onClick={exitSelectMode}
              className="text-xs text-neutral-400 hover:text-neutral-700"
            >
              {t('cancel')}
            </button>

            {pickerOpen && (
              <BatchConnectPicker
                items={[...selected.values()]}
                myChannels={myChannels}
                excludeChannelId={channelDocumentId}
                onClose={() => setPickerOpen(false)}
                onDone={(result) => {
                  setStatusMsg(
                    tc('connectedStatus', { succeeded: result.succeeded }) +
                      (result.failed ? tc('connectedFailed', { failed: result.failed }) : '')
                  );
                  exitSelectMode();
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
