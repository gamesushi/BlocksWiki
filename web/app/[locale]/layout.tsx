import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { routing } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import '@/app/globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    metadataBase: new URL(SITE_URL),
    title: t('title'),
    description: t('description'),
    // hreflang：每个语言版本互链。布局层只掌握根路径，深层页面可在各自的
    // generateMetadata 里用 getPathname({href, locale}) 覆盖更精确的路径。
    alternates: {
      languages: {
        zh: getPathname({ href: '/', locale: 'zh' }),
        en: getPathname({ href: '/', locale: 'en' }),
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const htmlLang = locale === 'zh' ? 'zh-CN' : 'en';

  // 单次请求内统一 `now`，供 next-intl 的 relativeTime 使用：
  // 既消除 "ENVIRONMENT_FALLBACK" 警告，又因同一时间戳被序列化到客户端
  // 而避免服务端/客户端 hydration 不一致。
  const now = new Date();

  return (
    <html
      lang={htmlLang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* 首屏前应用已保存的主题，避免换肤闪烁（FOUC） */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');if(t&&t!=='system'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();",
          }}
        />
        <NextIntlClientProvider now={now}>
          <SiteHeader />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
