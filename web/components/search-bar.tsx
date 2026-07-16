'use client';

import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useTransition } from 'react';

/**
 * instant=false（首页）：回车跳转 /search?q=。
 * instant=true（搜索页）：防抖 350ms 后 router.replace(?q=)，服务端组件重渲染出结果，
 *   URL 保持可分享、SSR 与分页原样工作。useTransition 提供"搜索中"态且不阻塞输入。
 */
export function SearchBar({
  defaultValue = '',
  instant = false,
}: {
  defaultValue?: string;
  instant?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const router = useRouter();
  const t = useTranslations('Search');
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 防抖导航后 defaultValue 会随 URL 变化回流；仅当用户未在输入时才同步，避免打断
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setValue(defaultValue);
  }, [defaultValue]);

  const go = (q: string) => {
    const trimmed = q.trim();
    startTransition(() => {
      router.replace(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search', {
        scroll: false,
      });
    });
  };

  const onChange = (next: string) => {
    setValue(next);
    if (!instant) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => go(next), 350);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    const q = value.trim();
    if (instant) go(q);
    else if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <form onSubmit={onSubmit} className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => (focused.current = true)}
        onBlur={() => (focused.current = false)}
        placeholder={t('placeholder')}
        className="w-full rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-sm outline-none focus:border-neutral-400"
      />
      {instant && isPending && (
        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs text-neutral-300">
          {t('searching')}
        </span>
      )}
    </form>
  );
}
