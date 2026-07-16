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
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base-content/35">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3m1.8-5.2a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
        </svg>
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => (focused.current = true)}
        onBlur={() => (focused.current = false)}
        placeholder={t('placeholder')}
        className="input input-bordered w-full rounded-full bg-base-100 pl-11 pr-5 text-sm shadow-sm transition-all focus:border-primary/50 focus:shadow-md focus:outline-none"
      />
      {instant && isPending && (
        <span className="absolute right-5 top-1/2 -translate-y-1/2">
          <span className="loading loading-spinner loading-xs text-base-content/30" />
        </span>
      )}
    </form>
  );
}
