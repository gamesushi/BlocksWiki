'use client';

/**
 * 两击确认删除按钮（不用 confirm()/alert() 模态，避免阻塞且 UX 更顺）。
 * 第一击进入确认态，3 秒不二次点击自动还原。
 */
import { useRef, useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('Common');
  const te = useTranslations('Errors');

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
        setError(result.error ?? te('actionFailedShort'));
      }
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-error">{error}</span>}
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className={`rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-40 ${
          arming
            ? 'border-error/40 bg-error/10 text-error'
            : 'border-base-300 text-base-content/50 hover:border-base-content/40 hover:text-base-content'
        }`}
      >
        {isPending ? t('deleting') : arming ? confirmLabel : label}
      </button>
    </span>
  );
}
