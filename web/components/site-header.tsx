/**
 * 全站顶栏 —— 对齐 Are.na：左侧 Logo/首页链接，右侧 登录/注册 或 用户名+退出。
 * 放在 root layout 里，所有页面共享。
 */
import Link from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { getSession, logout } from '@/app/actions/auth';
import { LocaleSwitcher } from '@/components/locale-switcher';

export async function SiteHeader() {
  const session = await getSession();
  const me = session?.me ?? null;
  const t = await getTranslations('Nav');

  return (
    <header className="border-b border-neutral-100 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-2.5 text-sm">
        {/* 左侧：品牌 + 首页 */}
        <Link href="/" className="font-medium tracking-tight text-neutral-900 hover:text-neutral-600">
          BlocksWiki
        </Link>

        {/* 右侧：认证 + 语言切换 */}
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          {me ? (
            <>
              <span className="text-neutral-400">{me.username}</span>
              <form action={logout}>
                <button type="submit" className="text-neutral-500 hover:text-neutral-900">
                  {t('logout')}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-neutral-500 hover:text-neutral-900">
                {t('login')}
              </Link>
              <Link
                href="/login?mode=register"
                className="rounded-md border border-neutral-200 px-3 py-1 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900"
              >
                {t('signup')}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
