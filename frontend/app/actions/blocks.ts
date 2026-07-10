'use server';

/**
 * 发布 Block：Editor.js OutputData -> Strapi blocks.content (JSON)
 * 数据原样透传，中间不做任何 HTML 化 —— JSON 进，JSON 存，JSON 出。
 */
import { updateTag } from 'next/cache';
import { strapiFetch, StrapiError, type StrapiResponse } from '@/lib/strapi';
import type { Block, EditorJsOutput } from '@/lib/types';

export type CreateBlockResult =
  | { ok: true; block: Block }
  | { ok: false; error: string };

export async function updateBlock(
  documentId: string,
  content: EditorJsOutput
): Promise<{ ok: boolean; error?: string; documentId?: string }> {
  if (!content?.blocks?.length) {
    return { ok: false, error: '内容为空。' };
  }
  const hasImage = content.blocks.some((b) => b.type === 'image');
  try {
    await strapiFetch<StrapiResponse<Block>>(`/blocks/${documentId}`, {
      method: 'PUT',
      body: { data: { content, blockType: hasImage ? 'image' : 'text' } },
    });
    updateTag('feed');
    updateTag(`block:${documentId}`);
    return { ok: true, documentId };
  } catch (err) {
    if (err instanceof StrapiError) {
      if (err.status === 401) return { ok: false, error: '请先登录。' };
      if (err.status === 403) return { ok: false, error: '只能编辑自己发布的 Block。' };
    }
    return { ok: false, error: '保存失败，请重试。' };
  }
}

export async function updateBlockDescription(
  documentId: string,
  description: string
): Promise<{ ok: boolean; error?: string }> {
  if (description.length > 2000) {
    return { ok: false, error: '描述过长（上限 2000 字）。' };
  }
  try {
    await strapiFetch(`/blocks/${documentId}/description`, {
      method: 'PUT',
      body: { data: { description } },
    });
    updateTag(`block:${documentId}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof StrapiError) {
      if (err.status === 401) return { ok: false, error: '请先登录。' };
      if (err.status === 403) return { ok: false, error: '只能编辑自己发布的 Block。' };
    }
    return { ok: false, error: '保存失败，请重试。' };
  }
}

export async function deleteBlock(
  documentId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await strapiFetch(`/blocks/${documentId}`, { method: 'DELETE' });
    updateTag('feed');
    updateTag(`block:${documentId}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof StrapiError && err.status === 403) {
      return { ok: false, error: '只能删除自己发布的 Block。' };
    }
    return { ok: false, error: '删除失败，请重试。' };
  }
}

export async function createBlock(
  content: EditorJsOutput,
  blockType: Block['blockType'] = 'text'
): Promise<CreateBlockResult> {
  if (!content?.blocks?.length) {
    return { ok: false, error: '内容为空，无法发布。' };
  }

  try {
    const res = await strapiFetch<StrapiResponse<Block>>('/blocks', {
      method: 'POST',
      body: { data: { content, blockType } }, // creator 由后端从 JWT 注入
    });
    // updateTag（Next 16）：立即过期并等新数据 —— 发布后回到 Feed 必须看到自己的 Block
    updateTag('feed');
    return { ok: true, block: res.data };
  } catch (err) {
    const message =
      err instanceof StrapiError && err.status === 401
        ? '请先登录再发布。'
        : '发布失败，请稍后重试。';
    return { ok: false, error: message };
  }
}
