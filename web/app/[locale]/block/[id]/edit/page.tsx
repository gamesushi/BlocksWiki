/**
 * Block 编辑页：载入现有 content 到 Editor.js，保存走 updateBlock。
 * 权限：仅作者本人可进（非作者跳回详情页）；后端 update 也会再校验一次。
 */
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/app/actions/auth';
import { strapiFetch, type StrapiResponse } from '@/lib/strapi';
import { EditBlockForm } from '@/components/edit-block-form';
import type { Block } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function EditBlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let block: Block;
  try {
    block = (await strapiFetch<StrapiResponse<Block>>(`/blocks/${id}`, { revalidate: 0 })).data;
  } catch {
    notFound();
  }

  const session = await getSession();
  if (!session || session.me.username !== block.creatorName) {
    redirect(`/block/${id}`);
  }

  return (
    <EditBlockForm
      documentId={id}
      initialData={block.content}
      initialDescription={block.description ?? ''}
    />
  );
}
