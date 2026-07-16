import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// 轻量封装 Next.js 导航 API，自动带上当前 locale 前缀。
// 全站所有 <Link> / redirect / usePathname / useRouter 都应从这里导入，
// 不要再从 next/navigation / next/link 直接导入，否则会丢失 locale 前缀。
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

// 同时导出默认 Link，兼容 `import Link from '@/i18n/navigation'`（与命名导入等价）。
export default Link;
