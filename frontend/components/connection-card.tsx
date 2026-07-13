'use client';

import Link from 'next/link';
import { DisconnectButton } from '@/components/disconnect-button';
import { sourceHost } from '@/lib/markdown';
import type { DragHandlers } from '@/components/paginated-list';
import type { Connection } from '@/lib/types';

/** 选中态的方形复选框，左上角叠加；selectMode 关闭时不渲染。 */
function SelectCheckbox({ selected }: { selected: boolean }) {
  return (
    <span
      className={`pointer-events-none absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border text-[11px] ${
        selected
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-neutral-300 bg-white/90 text-transparent'
      }`}
    >
      ✓
    </span>
  );
}

/**
 * 频道页的一张卡片：渲染 Connection（连结者署名 + 频道主可见的 disconnect ✕）。
 * 与 BlockCard 的区别：署名是"由 X 连结"而非作者，且带解连结动作。
 * drag 存在时（频道主/协作者 + Grid 视图）整卡可拖拽排序；
 * selectMode 存在时点击卡片切换多选而非导航，与 drag 互斥（由页面层保证不同时开启）。
 */
export function ConnectionCard({
  conn,
  channelSlug,
  isOwner,
  drag,
  selectMode,
  selected,
  onToggleSelect,
}: {
  conn: Connection;
  channelSlug: string;
  isOwner: boolean;
  drag?: DragHandlers;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const dragProps = drag && {
    draggable: drag.draggable,
    onDragStart: drag.onDragStart,
    onDragOver: drag.onDragOver,
    onDrop: drag.onDrop,
    onDragEnd: drag.onDragEnd,
  };
  const dragCls = drag ? 'cursor-grab active:cursor-grabbing' : '';
  const draggingCls = drag?.isDragging ? 'opacity-30' : '';
  const selectedCls = selectMode && selected ? 'ring-2 ring-blue-500 ring-offset-1' : '';

  const onLinkClick = (e: React.MouseEvent) => {
    if (!selectMode) return;
    e.preventDefault();
    onToggleSelect?.();
  };

  // 频道套频道：内容是一个频道 → 渲染频道块（深色卡片，与 block 区分）
  if (conn.contentChannel) {
    const ch = conn.contentChannel;
    return (
      <li className={`group relative flex flex-col ${dragCls} ${draggingCls}`} {...dragProps}>
        {drag && <span className="pointer-events-none absolute right-2 top-2 z-10 text-xs text-neutral-500 opacity-0 group-hover:opacity-100">⠿</span>}
        {selectMode && <SelectCheckbox selected={!!selected} />}
        <Link
          href={`/channel/${ch.slug}`}
          onClick={onLinkClick}
          className={`flex aspect-square flex-col justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-neutral-100 transition-opacity hover:opacity-90 ${selectedCls}`}
        >
          <span className="text-[10px] uppercase tracking-widest text-neutral-500">Channel</span>
          <span className="text-sm font-medium leading-snug">{ch.title}</span>
          <span className="text-[11px] text-neutral-400">{ch.connectionCount} blocks</span>
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-neutral-400">由 {conn.connectorName} 连结</span>
          {isOwner && !selectMode && <DisconnectButton connectionId={conn.documentId} channelSlug={channelSlug} />}
        </div>
      </li>
    );
  }

  if (!conn.block) return null;
  return (
    <li className={`group relative flex flex-col ${dragCls} ${draggingCls}`} {...dragProps}>
      {drag && <span className="pointer-events-none absolute right-2 top-2 z-10 text-xs text-neutral-300 opacity-0 group-hover:opacity-100">⠿</span>}
      {selectMode && <SelectCheckbox selected={!!selected} />}
      <Link
        href={`/block/${conn.block.documentId}`}
        onClick={onLinkClick}
        className={`flex aspect-square flex-col rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-400 ${selectedCls}`}
      >
        {conn.block.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={conn.block.coverImageUrl} alt="" draggable={false} className="h-full w-full rounded object-cover" />
        ) : (
          <p className="line-clamp-6 text-sm leading-relaxed text-neutral-700">
            {conn.block.excerpt || '(空白 Block)'}
          </p>
        )}
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-neutral-400">
          由 {conn.connectorName} 连结 · {conn.block.connectionCount} 处引用
          {conn.block.sourceUrl &&
            (() => {
              const h = sourceHost(conn.block.sourceUrl);
              return h ? (
                <>
                  {' · '}来源{' '}
                  <a
                    href={conn.block.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-neutral-900"
                  >
                    ↗ {h}
                  </a>
                </>
              ) : null;
            })()}
        </span>
        {isOwner && !selectMode && <DisconnectButton connectionId={conn.documentId} channelSlug={channelSlug} />}
      </div>
    </li>
  );
}
