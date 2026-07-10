'use client';

/**
 * 两击确认删除按钮（不用 confirm()/alert() 模态，避免阻塞且 UX 更顺）。
 * 第一击进入确认态，3 秒不二次点击自动还原。
 */
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteButton({
  label,
  confirmLabel,
  action,
  redirectTo,
}: {
  label: string;
  confirmLabel: string;
  action: () => Promise<{ ok: boolean; error?: string }>;
  redirectTo: string;
}) {
  const [arming, setArming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const onClick = () => {
    if (!arming) {
      setArming(true);
      timer.current = setTimeout(() => setArming(false), 3000);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        router.push(redirectTo);
      } else {
        setArming(false);
        setError(result.error ?? '操作失败。');
      }
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-red-500">{error}</span>}
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className={`rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-40 ${
          arming
            ? 'border-red-300 bg-red-50 text-red-600'
            : 'border-neutral-200 text-neutral-400 hover:border-neutral-400 hover:text-neutral-600'
        }`}
      >
        {isPending ? '删除中…' : arming ? confirmLabel : label}
      </button>
    </span>
  );
}
