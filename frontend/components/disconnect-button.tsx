'use client';

/**
 * 频道主移除连结（只解边，Block 本体不动）。
 * 仅在当前用户是 Channel 主人时由服务端组件渲染。
 */
import { useState, useTransition } from 'react';
import { disconnectBlock } from '@/app/actions/connections';

export function DisconnectButton({
  connectionId,
  channelSlug,
}: {
  connectionId: string;
  channelSlug: string;
}) {
  const [removed, setRemoved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const remove = () => {
    startTransition(async () => {
      const { ok } = await disconnectBlock(connectionId, channelSlug);
      if (ok) setRemoved(true);
      else alert('移除失败，请重试。');
    });
  };

  if (removed) return null;

  return (
    <button
      type="button"
      onClick={remove}
      disabled={isPending}
      title="从此频道移除（不删除 Block 本体）"
      className="rounded-full px-2 py-0.5 text-xs text-neutral-300 hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-40"
    >
      {isPending ? '…' : '✕'}
    </button>
  );
}
