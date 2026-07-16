import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Next.js 16 中 middleware 已更名为 proxy（导出 default 或 proxy 函数皆可）。
// 负责 locale 协商：无前缀路径重定向到默认/协商语言，如 / -> /zh。
export default createMiddleware(routing);

export const config = {
  // 匹配所有路径，但排除：
  // - api（API routes，无语言前缀）
  // - uploads（next.config 里代理到 Strapi 的静态资源，不能加 locale 前缀）
  // - _next / _vercel（Next 内部）
  // - 含点号的路径（favicon.ico / manifest.webmanifest 等元数据文件）
  matcher: '/((?!api|uploads|_next|_vercel|.*\\..*).*)',
};
