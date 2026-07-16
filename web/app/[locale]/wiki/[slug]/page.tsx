/**
 * 单个 Wiki 页：左侧导航树 + 主内容（intro + 解析后的 items）。
 * 草稿仅管理员可见（后端 findOne 对无权者 404）。
 */
import type { Metadata } from 'next';
import Link, { getPathname } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { getSession } from '@/app/actions/auth';
import { getWikiTree, getWikiPage, resolveWikiItems } from '@/app/actions/wiki';
import { WikiNav } from '@/components/wiki-nav';
import { WikiContent } from '@/components/wiki-content';
import { RenderBlocks } from '@/lib/render-blocks';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = getPathname({ href: `/wiki/${slug}`, locale: loc });
  }
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    alternates: { languages },
  };
}

export default async function WikiPageView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTranslations('Wiki');
  const tn = await getTranslations('Nav');
  const [page, nodes, session] = await Promise.all([getWikiPage(slug), getWikiTree(), getSession()]);
  if (!page) notFound();

  const isAdmin = !!session?.me.isAdmin;
  const resolved = await resolveWikiItems(page.items ?? []);

  return (
    <main className="px-6 py-10">
      <header className="mb-8 flex items-center gap-4">
        <Link href="/wiki" className="text-xs uppercase tracking-widest text-neutral-400 hover:text-neutral-900">
          ← {tn('wiki')}
        </Link>
        {isAdmin && (
          <Link
            href={`/wiki/${slug}/edit`}
            className="ml-auto rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-500 hover:border-neutral-900 hover:text-neutral-900"
          >
            {t('edit')}
          </Link>
        )}
      </header>

      <div className="grid gap-10 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-10 md:self-start">
          <WikiNav nodes={nodes} activeSlug={slug} />
        </aside>

        <article className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <h1 className="text-2xl font-medium tracking-tight">{page.title}</h1>
            {!page.published && <span className="text-xs text-amber-500">{t('draft')}</span>}
          </div>
          {page.curatorName && (
            <p className="mb-8 text-xs text-neutral-400">{t('curatedBy', { name: page.curatorName })}</p>
          )}

          {page.intro && (
            <div className="mb-10 border-l-2 border-neutral-200 pl-4 text-neutral-600">
              <RenderBlocks content={page.intro} />
            </div>
          )}

          {resolved.length === 0 ? (
            <p className="text-sm text-neutral-400">{t('empty')}</p>
          ) : (
            <WikiContent items={resolved} />
          )}
        </article>
      </div>
    </main>
  );
}
