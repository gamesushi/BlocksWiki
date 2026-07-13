/**
 * Wiki 首页：导航树 + 顶层页面入口。管理员可见"新建页面"。
 */
import Link from 'next/link';
import { getSession } from '@/app/actions/auth';
import { getWikiTree } from '@/app/actions/wiki';
import { WikiNav } from '@/components/wiki-nav';

export const dynamic = 'force-dynamic';

export default async function WikiHomePage() {
  const [nodes, session] = await Promise.all([getWikiTree(), getSession()]);
  const isAdmin = !!session?.me.isAdmin;
  const roots = nodes.filter((n) => !n.parentId || !nodes.some((m) => m.documentId === n.parentId));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-10 flex flex-wrap items-center gap-4">
        <h1 className="text-lg font-medium tracking-tight">生活百科 Wiki</h1>
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-900">← BlockWiki</Link>
        {isAdmin && (
          <Link
            href="/wiki/new"
            className="ml-auto rounded-full bg-neutral-900 px-4 py-1.5 text-xs text-white hover:bg-neutral-700"
          >
            + 新建页面
          </Link>
        )}
      </header>

      <div className="grid gap-10 md:grid-cols-[220px_1fr]">
        <aside>
          <WikiNav nodes={nodes} />
        </aside>
        <section>
          <p className="mb-6 text-sm leading-relaxed text-neutral-500">
            由管理员从平台的 Block 与频道精选、编排而成的知识库。
          </p>
          {roots.length === 0 ? (
            <p className="text-sm text-neutral-400">
              还没有页面{isAdmin ? '，点右上角新建。' : '。'}
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {roots.map((n) => (
                <li key={n.documentId}>
                  <Link
                    href={`/wiki/${n.slug}`}
                    className="block rounded-lg border border-neutral-200 bg-white px-5 py-4 transition-colors hover:border-neutral-400"
                  >
                    <span className="text-sm font-medium text-neutral-900">{n.title}</span>
                    {!n.published && <span className="ml-2 text-[10px] text-amber-500">草稿</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
