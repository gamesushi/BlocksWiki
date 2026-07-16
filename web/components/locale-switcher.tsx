'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

const LABELS: Record<Locale, string> = {
  zh: '中文',
  en: 'EN',
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: Locale) {
    if (next === locale) return;
    // next-intl 的 usePathname 返回不含 locale 前缀的路径，
    // replace 时带上 { locale } 即可在同路径切换语言。
    router.replace(pathname, { locale: next });
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      {routing.locales.map((loc, i) => (
        <span key={loc} className="flex items-center gap-1">
          {i > 0 && <span className="text-base-content/30">/</span>}
          <button
            type="button"
            onClick={() => switchTo(loc)}
            className={
              loc === locale
                ? 'font-medium text-base-content'
                : 'text-base-content/50 hover:text-base-content/70'
            }
            aria-current={loc === locale ? 'true' : undefined}
          >
            {LABELS[loc]}
          </button>
        </span>
      ))}
    </div>
  );
}
