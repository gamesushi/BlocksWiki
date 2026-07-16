/**
 * Block 详情页：are.na 风格双栏布局。
 * 左侧 = 内容区（正文）；右侧 = 信息栏（元数据 / 描述 / 操作 / 关联频道 / 评论）。
 */
import type { Metadata } from 'next';
import Link, { getPathname } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { TimeAgo } from '@/components/time-ago';
import { getSession } from '@/app/actions/auth';
import { deleteBlock } from '@/app/actions/blocks';
import { getComments } from '@/app/actions/comments';
import { strapiFetch, type StrapiResponse } from '@/lib/strapi';
import { RenderBlocks } from '@/lib/render-blocks';
import { sourceHost } from '@/lib/markdown';
import { ConnectButton } from '@/components/connect-button';
import { DeleteButton } from '@/components/delete-button';
import { BlockDescription } from '@/components/block-description';
import { CommentSection } from '@/components/comment-section';
import type { Block, Connection } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = getPathname({ href: `/block/${id}`, locale: loc });
  }
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    alternates: { languages },
  };
}

export default async function BlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations('Block');
  const tc = await getTranslations('Common');

  let block: Block;
  try {
    block = (
      await strapiFetch<StrapiResponse<Block>>(`/blocks/${id}`, {
        tags: [`block:${id}`],
        revalidate: 300,
      })
    ).data;
  } catch {
    notFound();
  }

  const connQs = new URLSearchParams({
    'filters[block][documentId][$eq]': id,
    'filters[channel][$notNull]': 'true',
    'fields[0]': 'connectorName',
    'sort[0]': 'createdAt:desc',
    'populate[channel][fields][0]': 'title',
    'populate[channel][fields][1]': 'slug',
  });

  // block→block 出链：本 block 正文里链出的 block
  const outgoingQs = new URLSearchParams({
    'filters[block][documentId][$eq]': id,
    'filters[targetBlock][$notNull]': 'true',
    'fields[0]': 'connectorName',
    'sort[0]': 'createdAt:desc',
    'populate[targetBlock][fields][0]': 'documentId',
    'populate[targetBlock][fields][1]': 'excerpt',
    'populate[targetBlock][fields][2]': 'blockType',
  });
  // block→block 反链：链到本 block 的 block
  const incomingQs = new URLSearchParams({
    'filters[targetBlock][documentId][$eq]': id,
    'fields[0]': 'connectorName',
    'sort[0]': 'createdAt:desc',
    'populate[block][fields][0]': 'documentId',
    'populate[block][fields][1]': 'excerpt',
    'populate[block][fields][2]': 'blockType',
  });

  const [connectionsRes, outgoingRes, incomingRes, session, comments] = await Promise.all([
    strapiFetch<StrapiResponse<Connection[]>>(`/connections?${connQs}`, {
      tags: [`block:${id}`],
      revalidate: 300,
    }),
    strapiFetch<StrapiResponse<Connection[]>>(`/connections?${outgoingQs}`, {
      tags: [`block:${id}`],
      revalidate: 300,
    }),
    strapiFetch<StrapiResponse<Connection[]>>(`/connections?${incomingQs}`, {
      tags: [`block:${id}`],
      revalidate: 300,
    }),
    getSession(),
    getComments(id),
  ]);
  const connections = connectionsRes.data;
  const outgoingLinks = outgoingRes.data;
  const incomingLinks = incomingRes.data;
  const me = session?.me ?? null;
  const myChannels = session?.channels ?? [];
  const isAuthor = me?.username === block.creatorName;

  return (
    <main className="px-6 py-10">
      {/* 顶栏 */}
      <div className="mx-auto mb-8 flex max-w-screen-xl items-center justify-between">
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-900">{tc('backHome')}</Link>
        <span className="flex items-center gap-2">
          {isAuthor && (
            <>
              <Link
                href={`/block/${block.documentId}/edit`}
                className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-500 hover:border-neutral-900 hover:text-neutral-900"
              >
                {t('edit')}
              </Link>
              <DeleteButton
                label={t('delete')}
                confirmLabel={t('confirmDelete')}
                action={deleteBlock.bind(null, block.documentId)}
                redirectTo="/"
              />
            </>
          )}
        </span>
      </div>

      {/* 双栏主体 */}
      <div className="mx-auto grid max-w-screen-xl gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── 左：内容区 ── */}
        <article className="min-w-0">
          <RenderBlocks content={block.content} />
        </article>

        {/* ── 右：信息侧栏 ── */}
        <aside className="min-w-0 space-y-8">
          {/* 描述 */}
          <BlockDescription
            blockId={block.documentId}
            initialDescription={block.description ?? ''}
            isAuthor={isAuthor}
          />

          {/* 元数据 */}
          <div className="space-y-1.5 text-xs text-neutral-400">
            <p>
              {t('by')}{' '}
              <Link href={`/user/${block.creatorName}`} className="text-neutral-500 hover:text-neutral-900">
                {block.creatorName}
              </Link>
            </p>
            <p>
              {t('publishedOn')} <TimeAgo date={block.createdAt} />
            </p>
            {block.sourceUrl &&
              (() => {
                const h = sourceHost(block.sourceUrl);
                return h ? (
                  <p>
                    {tc('source')}{' '}
                    <a href={block.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-neutral-900">
                      {h}
                    </a>
                  </p>
                ) : null;
              })()}
          </div>

          {/* Connect 按钮 */}
          {me && (
            <ConnectButton blockId={block.documentId} myChannels={myChannels} />
          )}

          {/* 分隔线 */}
          <div className="border-t border-neutral-100" />

          {/* 关联频道 */}
          <div>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-400">
              Connected to {connections.length} channel{connections.length !== 1 ? 's' : ''}
            </h2>
            <ul className="space-y-2">
              {connections.map((conn) =>
                conn.channel ? (
                  <li key={conn.documentId}>
                    <Link
                      href={`/channel/${conn.channel.slug}`}
                      className="block rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:border-neutral-400"
                    >
                      {conn.channel.title}
                      <span className="mt-0.5 block text-[11px] text-neutral-400">
                        {t('connectedBy', { name: conn.connectorName ?? '' })}
                      </span>
                    </Link>
                  </li>
                ) : null
              )}
            </ul>
          </div>

          {/* block→block 出链 */}
          <div>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-400">
              Links to {outgoingLinks.length} block{outgoingLinks.length !== 1 ? 's' : ''}
            </h2>
            {outgoingLinks.length === 0 ? (
              <p className="text-xs text-neutral-300">—</p>
            ) : (
              <ul className="space-y-2">
                {outgoingLinks.map((conn) =>
                  conn.targetBlock ? (
                    <li key={conn.documentId}>
                      <Link
                        href={`/block/${conn.targetBlock.documentId}`}
                        className="block rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:border-neutral-400"
                      >
                        {conn.targetBlock.excerpt || 'Untitled block'}
                      </Link>
                    </li>
                  ) : null
                )}
              </ul>
            )}
          </div>

          {/* block→block 反链 */}
          <div>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-400">
              Linked from {incomingLinks.length} block{incomingLinks.length !== 1 ? 's' : ''}
            </h2>
            {incomingLinks.length === 0 ? (
              <p className="text-xs text-neutral-300">—</p>
            ) : (
              <ul className="space-y-2">
                {incomingLinks.map((conn) =>
                  conn.block ? (
                    <li key={conn.documentId}>
                      <Link
                        href={`/block/${conn.block.documentId}`}
                        className="block rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:border-neutral-400"
                      >
                        {conn.block.excerpt || 'Untitled block'}
                      </Link>
                    </li>
                  ) : null
                )}
              </ul>
            )}
          </div>

          {/* 评论 */}
          <CommentSection blockId={block.documentId} initialComments={comments} me={me?.username ?? null} />
        </aside>
      </div>
    </main>
  );
}
