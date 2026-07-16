'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 阅读视图的「上一段 / 下一段」导航。
 * 固定底栏显示当前段序号与总数；按钮平滑滚动到相邻 block 段。
 * 阅读滚动时用 IntersectionObserver 同步当前段（取穿过视口中线的那一段），
 * 让按钮始终反映阅读位置。ids 为各 block 的 documentId，顺序即文章顺序。
 */
export function ReadNav({ ids }: { ids: string[] }) {
  const [current, setCurrent] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sections = ids
      .map((id) => document.getElementById(`block-${id}`))
      .filter((el): el is HTMLElement => !!el);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = sections.indexOf(entry.target as HTMLElement);
            if (idx >= 0) setCurrent(idx);
          }
        }
      },
      // 以视口中线为判定带：任意 block 段落跨过中线即视为"当前段"
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [ids.join(',')]);

  if (!mounted || ids.length <= 1) return null;

  const go = (idx: number) => {
    const clamped = Math.max(0, Math.min(ids.length - 1, idx));
    setCurrent(clamped);
    document
      .getElementById(`block-${ids[clamped]}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-base-300/60 bg-base-100/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2 text-sm">
        <button
          type="button"
          onClick={() => go(current - 1)}
          disabled={current === 0}
          className="rounded-full border border-base-300 px-4 py-1.5 text-base-content/70 transition-colors hover:border-base-content/40 hover:text-base-content disabled:opacity-30"
        >
          ← 上一段
        </button>
        <span className="text-xs bw-muted">
          第 {current + 1} / {ids.length} 段
        </span>
        <button
          type="button"
          onClick={() => go(current + 1)}
          disabled={current === ids.length - 1}
          className="rounded-full border border-base-300 px-4 py-1.5 text-base-content/70 transition-colors hover:border-base-content/40 hover:text-base-content disabled:opacity-30"
        >
          下一段 →
        </button>
      </div>
    </nav>
  );
}
