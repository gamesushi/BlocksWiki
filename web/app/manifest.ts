import type { MetadataRoute } from 'next';

/**
 * PWA manifest。start_url 直指 /capture：从主屏幕点开就是采集框。
 * share_target 仅 Android Chrome 生效（iOS 忽略，无害）；
 * iOS 的系统分享入口由「快捷指令」承担，见 README §7。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BlocksWiki',
    short_name: 'BlocksWiki',
    description: '基于 Block 的生活 Wiki',
    start_url: '/capture',
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#171717',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // MetadataRoute.Manifest 类型尚未收录 share_target，运行时合法
    ...({
      share_target: {
        action: '/capture',
        method: 'GET',
        params: { title: 'title', text: 'text', url: 'url' },
      },
    } as Record<string, unknown>),
  } as MetadataRoute.Manifest;
}
