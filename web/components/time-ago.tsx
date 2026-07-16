'use client';

import { useFormatter } from 'next-intl';

// 统一的相对时间显示（"刚刚 / 5 分钟前" ⇄ "just now / 5 minutes ago"）。
// 替换原先在 feed-row / notification-row / comment-section / channel 页里
// 重复了 4 份的 timeAgo 函数，并自动跟随当前 locale。
export function TimeAgo({
  date,
  className,
}: {
  date?: string | Date | null;
  className?: string;
}) {
  const format = useFormatter();
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;

  return (
    <time dateTime={d.toISOString()} className={className}>
      {format.relativeTime(d, { style: 'short' })}
    </time>
  );
}
