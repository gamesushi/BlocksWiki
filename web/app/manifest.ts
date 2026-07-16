import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import zh from '@/messages/zh.json';
import en from '@/messages/en.json';

// manifest 是「无 locale 前缀」的根级路由，静态生成时拿不到请求级 locale，
// 因此不走 next-intl 的 request 上下文（会报 "Couldn't find next-intl config file"）。
// 直接读默认语言的词条即可（兜底 zh）。
const messages: Record<string, typeof zh> = { zh, en };

/**
 * PWA manifest。start_url 指向 /publish：从主屏幕点开进入创建页。
 * share_target 仅 Android Chrome 生效（iOS 忽略，无害），分享内容落到 /publish。
 */
export default function manifest(): MetadataRoute.Manifest {
  const t = messages[routing.defaultLocale] ?? zh;
  return {
    name: 'BlocksWiki',
    short_name: 'BlocksWiki',
    description: t.Common.tagline,
    start_url: '/publish',
    display: 'standalone',
    background_color: '#faf8f4',
    theme_color: '#e0795a',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // MetadataRoute.Manifest 类型尚未收录 share_target，运行时合法
    ...({
      share_target: {
        action: '/publish',
        method: 'GET',
        params: { title: 'title', text: 'text', url: 'url' },
      },
    } as Record<string, unknown>),
  } as MetadataRoute.Manifest;
}
