'use server';

import { updateTag } from 'next/cache';
import { strapiFetch, StrapiError, type StrapiResponse } from '@/lib/strapi';
import { getTranslations } from 'next-intl/server';
import type { Comment } from '@/lib/types';

export async function getComments(blockId: string): Promise<Comment[]> {
  const qs = new URLSearchParams({
    'filters[block][documentId][$eq]': blockId,
    'sort[0]': 'createdAt:asc',
    'pagination[pageSize]': '200',
    'fields[0]': 'body',
    'fields[1]': 'authorName',
  });
  try {
    const res = await strapiFetch<StrapiResponse<Comment[]>>(`/comments?${qs}`, { revalidate: 0 });
    return res.data;
  } catch {
    return [];
  }
}

export async function postComment(
  blockId: string,
  body: string
): Promise<{ ok: boolean; error?: string; comment?: Comment }> {
  const t = await getTranslations('Errors');
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: t('commentEmpty') };
  if (trimmed.length > 2000) return { ok: false, error: t('commentTooLong') };

  try {
    const res = await strapiFetch<StrapiResponse<Comment>>('/comments', {
      method: 'POST',
      body: { data: { body: trimmed, blockId } },
    });
    updateTag(`block:${blockId}`);
    return { ok: true, comment: res.data };
  } catch (err) {
    if (err instanceof StrapiError && (err.status === 401 || err.status === 403)) {
      return { ok: false, error: t('loginToComment') };
    }
    return { ok: false, error: t('commentPublishFailed') };
  }
}

export async function deleteComment(
  commentId: string,
  blockId: string
): Promise<{ ok: boolean; error?: string }> {
  const t = await getTranslations('Errors');
  try {
    await strapiFetch(`/comments/${commentId}`, { method: 'DELETE' });
    updateTag(`block:${blockId}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof StrapiError && err.status === 403) {
      return { ok: false, error: t('onlyOwnCommentDelete') };
    }
    return { ok: false, error: t('deleteFailed') };
  }
}
