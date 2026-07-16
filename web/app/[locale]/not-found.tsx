import { Link } from '@/i18n/navigation';

// 落在 [locale] 段内但无匹配路由时（如 /zh/does-not-exist）的 404。
// 保持轻量：不依赖翻译上下文，避免兜底场景下的运行时错误。
export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-medium text-base-content">404</h1>
      <p className="text-sm text-base-content/60">页面不存在 / Page not found</p>
      <Link
        href="/"
        className="bw-btn-ghost"
      >
        返回首页 / Home
      </Link>
    </main>
  );
}
