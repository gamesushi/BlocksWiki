/**
 * Block 详情页：唯一加载完整 content JSON 的地方。
 * 侧栏展示该 Block 被连结到的所有 Channel（图的反向边）。
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
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

export default async function BlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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
    'fields[0]': 'connectorName',
    'sort[0]': 'createdAt:desc',
    'populate[channel][fields][0]': 'title',
    'populate[channel][fields][1]': 'slug',
  });
  const [connectionsRes, session, comments] = await Promise.all([
    strapiFetch<StrapiResponse<Connection[]>>(`/connections?${connQs}`, {
      tags: [`block:${id}`],
      revalidate: 300,
    }),
    getSession(),
    getComments(id),
  ]);
  const connections = connectionsRes.data;
  const me = session?.me ?? null;
  const myChannels = session?.channels ?? [];
  const isAuthor = me?.username === block.creatorName;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-10 flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-900">← BlockWiki</Link>
        <span className="flex items-center gap-2">
          {isAuthor && (
            <>
              <Link
                href={`/block/${block.documentId}/edit`}
                className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-500 hover:border-neutral-900 hover:text-neutral-900"
              >
                编辑
              </Link>
              <DeleteButton
                label="删除"
                confirmLabel="确认删除？"
                action={deleteBlock.bind(null, block.documentId)}
                redirectTo="/"
              />
            </>
          )}
          {me && <ConnectButton blockId={block.documentId} myChannels={myChannels} />}
        </span>
      </header>

      <div className="grid gap-12 md:grid-cols-[1fr_220px]">
        <article className="min-w-0">
          <RenderBlocks content={block.content} />
          <p className="mb-6 mt-2 text-xs text-neutral-400">
            <Link href={`/user/${block.creatorName}`} className="hover:text-neutral-900">
              {block.creatorName}
            </Link>{' '}
            发布于 {new Date(block.createdAt).toLocaleDateString('zh-CN')}
            {block.sourceUrl &&
              (() => {
                const h = sourceHost(block.sourceUrl);
                return h ? (
                  <>
                    {' · '}来源{' '}
                    <a
                      href={block.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-neutral-900"
                    >
                      {h}
                    </a>
                  </>
                ) : null;
              })()}
          </p>

          <BlockDescription
            blockId={block.documentId}
            initialDescription={block.description ?? ''}
            isAuthor={isAuthor}
          />

          <div className="my-8 border-t border-neutral-100" />

          <CommentSection blockId={block.documentId} initialComments={comments} me={me?.username ?? null} />
        </article>

        <aside>
          <h2 className="mb-3 text-xs uppercase tracking-widest text-neutral-400">
            Connected to {connections.length} channels
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
                    <span className="mt-0.5 block text-[11px] text-neutral-400">由 {conn.connectorName} 连结</span>
                  </Link>
                </li>
              ) : null
            )}
          </ul>
        </aside>
      </div>
    </main>
  );
}
