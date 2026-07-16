'use server';

/**
 * 发布 Block：Editor.js OutputData -> Strapi blocks.content (JSON)
 * 数据原样透传，中间不做任何 HTML 化 —— JSON 进，JSON 存，JSON 出。
 */
import { updateTag } from 'next/cache';
import { strapiFetch, StrapiError, type StrapiResponse } from '@/lib/strapi';
import { getTranslations } from 'next-intl/server';
import type { Block, EditorJsOutput } from '@/lib/types';

export type CreateBlockResult =
  | { ok: true; block: Block }
  | { ok: false; error: string };

export async function updateBlock(
  documentId: string,
  content: EditorJsOutput
): Promise<{ ok: boolean; error?: string; documentId?: string }> {
  const t = await getTranslations('Errors');
  if (!content?.blocks?.length) {
    return { ok: false, error: t('emptyContent') };
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
      if (err.status === 401) return { ok: false, error: t('loginRequired') };
      if (err.status === 403) return { ok: false, error: t('onlyOwnBlockEdit') };
    }
    return { ok: false, error: t('saveFailed') };
  }
}

export async function updateBlockDescription(
  documentId: string,
  description: string
): Promise<{ ok: boolean; error?: string }> {
  const t = await getTranslations('Errors');
  if (description.length > 2000) {
    return { ok: false, error: t('descriptionTooLong') };
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
      if (err.status === 401) return { ok: false, error: t('loginRequired') };
      if (err.status === 403) return { ok: false, error: t('onlyOwnBlockEdit') };
    }
    return { ok: false, error: t('saveFailed') };
  }
}

export async function deleteBlock(
  documentId: string
): Promise<{ ok: boolean; error?: string }> {
  const t = await getTranslations('Errors');
  try {
    await strapiFetch(`/blocks/${documentId}`, { method: 'DELETE' });
    updateTag('feed');
    updateTag(`block:${documentId}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof StrapiError && err.status === 403) {
      return { ok: false, error: t('onlyOwnBlockDelete') };
    }
    return { ok: false, error: t('deleteFailed') };
  }
}

export async function createBlock(
  content: EditorJsOutput,
  blockType: Block['blockType'] = 'text',
  sourceUrl?: string
): Promise<CreateBlockResult> {
  const t = await getTranslations('Errors');
  if (!content?.blocks?.length) {
    return { ok: false, error: t('emptyContentCannotPublish') };
  }

  try {
    const res = await strapiFetch<StrapiResponse<Block>>('/blocks', {
      method: 'POST',
      // creator 由后端从 JWT 注入；sourceUrl（来源溯源）一并透传，后端校验 http(s)
      body: { data: { content, blockType, ...(sourceUrl ? { sourceUrl } : {}) } },
    });
    // updateTag（Next 16）：立即过期并等新数据 —— 发布后回到 Feed 必须看到自己的 Block
    updateTag('feed');
    return { ok: true, block: res.data };
  } catch (err) {
    const message =
      err instanceof StrapiError && err.status === 401
        ? t('loginRequiredPublish')
        : t('publishFailed');
    return { ok: false, error: message };
  }
}
