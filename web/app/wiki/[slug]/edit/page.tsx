import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/app/actions/auth';
import { getWikiTree, getWikiPage, resolveWikiItems } from '@/app/actions/wiki';
import { WikiEditor, type EditorItem } from '@/components/wiki-editor';
import { contentToText } from '@/lib/editorjs-text';

export const dynamic = 'force-dynamic';

export default async function EditWikiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [session, page, nodes] = await Promise.all([getSession(), getWikiPage(slug), getWikiTree()]);
  if (!session?.me.isAdmin) redirect('/wiki');
  if (!page) notFound();

  // 把持久化的 items 还原为编辑器友好形态（带展示 label）
  const resolved = await resolveWikiItems(page.items ?? []);
  const editorItems: EditorItem[] = resolved.map((it) => {
    if (it.type === 'text') return { type: 'text', text: contentToText(it.content) };
    if (it.type === 'block')
      return {
        type: 'block',
        blockId: it.block?.documentId ?? '',
        label: it.block?.excerpt || '(已移除的 Block)',
        note: it.note ?? '',
      };
    return {
      type: 'channel',
      channelId: it.channel?.documentId ?? '',
      label: it.channel?.title || '(已移除的频道)',
      note: it.note ?? '',
    };
  });

  return (
    <WikiEditor
      mode="edit"
      documentId={page.documentId}
      slug={page.slug}
      nodes={nodes}
      initial={{
        title: page.title,
        introText: contentToText(page.intro),
        published: page.published,
        parent: page.parent?.documentId ?? null,
        order: page.order,
        items: editorItems,
      }}
    />
  );
}
