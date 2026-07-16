/**
 * 全站顶栏 —— 暖色主题下有存在感但不抢内容风头。
 * sticky + 微妙底阴影分隔页面；品牌用主色强调；注册按钮用 primary 实心。
 */
import Link from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { getSession, logout } from '@/app/actions/auth';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';

export async function SiteHeader() {
  const session = await getSession();
  const me = session?.me ?? null;
  const t = await getTranslations('Nav');

  return (
    <header className="sticky top-0 z-50 border-b border-base-300/60 bg-base-100/90 backdrop-blur-md supports-[backdrop-filter]:bg-base-100/70 shadow-sm">
      <nav className="navbar mx-auto max-w-screen-2xl px-4 sm:px-6">
        {/* 品牌 */}
        <div className="navbar-start gap-1">
          <Link
            href="/"
            className="btn btn-ghost text-base font-bold tracking-tight normal-case sm:text-lg"
            style={{ color: 'var(--color-primary)' }}
          >
            BlocksWiki
          </Link>
        </div>

        {/* 右侧 */}
        <div className="navbar-end items-center gap-1.5 sm:gap-2">
          <ThemeSwitcher />
          <LocaleSwitcher />
          {me ? (
            <>
              <span className="hidden text-sm text-base-content/60 sm:inline-flex">{me.username}</span>
              <form action={logout}>
                <button type="submit" className="btn btn-ghost btn-sm text-base-content/60 hover:text-base-content">
                  {t('logout')}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                {t('login')}
              </Link>
              <Link href="/login?mode=register" className="btn btn-primary btn-sm shadow-sm">
                {t('signup')}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
