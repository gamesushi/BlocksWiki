'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

/**
 * 风格切换器：可选 Mosaic（默认·Logo 蓝绿紫马赛克）/ Blocks（暖白·珊瑚）/
 * Corporate（商务·冷蓝）/ Cupcake（甜美·粉彩）/ Dracula（暗夜·紫），外加「跟随系统」。
 * 实际换肤走 data-theme 属性（DaisyUI 多主题），选择持久化到 localStorage，
 * 由 layout 里的内联脚本在首屏前应用，避免闪烁（FOUC）。
 * 文案走 next-intl（Theme 命名空间），随 locale 本地化；hint 保留 daisyUI 主题原名。
 */
const THEMES = [
  { value: 'system', hint: 'Auto' },
  { value: 'blocks', hint: 'Blocks' },
  { value: 'corporate', hint: 'Corporate' },
  { value: 'cupcake', hint: 'Cupcake' },
  { value: 'dracula', hint: 'Dracula' },
  { value: 'mosaic', hint: 'Mosaic' },
] as const;

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<string>('system');
  const t = useTranslations('Theme');

  useEffect(() => {
    const saved = localStorage.getItem('theme') ?? 'system';
    setTheme(saved);
  }, []);

  const apply = (value: string) => {
    setTheme(value);
    localStorage.setItem('theme', value);
    const root = document.documentElement;
    if (value === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', value);
  };

  const current = THEMES.find((t) => t.value === theme) ?? THEMES[0];

  return (
    <div className="dropdown dropdown-end">
      <button
        type="button"
        tabIndex={0}
        role="button"
        aria-label={t('ariaLabel')}
        className="btn btn-ghost btn-sm rounded-full gap-1.5 px-2.5"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.8"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2h9.25a2.25 2.25 0 0 1 1.59.659l3.5 3.5a2.25 2.25 0 0 1 .66 1.591V18A2.5 2.5 0 0 1 19 20.5H6.5A2.5 2.5 0 0 1 4 18V4.5z"
          />
          <circle cx="9" cy="8" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="15" cy="12" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="8.5" cy="14" r="1.2" fill="currentColor" stroke="none" />
        </svg>
        <span className="hidden text-xs sm:inline">{t(current.value)}</span>
      </button>
      <ul
        tabIndex={0}
        className="dropdown-content menu menu-sm z-50 mt-2 w-52 rounded-box border border-base-300 bg-base-100 p-1 shadow-lg"
      >
        {THEMES.map((opt) => (
          <li key={opt.value}>
            <button
              type="button"
              onClick={() => apply(opt.value)}
              className={theme === opt.value ? 'active' : ''}
            >
              <span className="flex-1 text-left text-sm">{t(opt.value)}</span>
              <span className="text-[10px] uppercase tracking-wider text-base-content/40">{opt.hint}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
