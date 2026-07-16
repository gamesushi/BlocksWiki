import { Link } from '@/i18n/navigation';

// 落在 [locale] 段内但无匹配路由时（如 /zh/does-not-exist）的 404。
// 保持轻量：不依赖翻译上下文，避免兜底场景下的运行时错误。
export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-medium text-neutral-900">404</h1>
      <p className="text-sm text-neutral-500">页面不存在 / Page not found</p>
      <Link
        href="/"
        className="rounded-md border border-neutral-200 px-4 py-1.5 text-xs text-neutral-600 hover:border-neutral-400 hover:text-neutral-900"
      >
        返回首页 / Home
      </Link>
    </main>
  );
}
