'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { strapiFetch, StrapiError, type StrapiResponse } from '@/lib/strapi';
import { getTranslations } from 'next-intl/server';
import type { Channel } from '@/lib/types';

export type CreateChannelState = { error: string } | null;

export async function createChannel(
  _prev: CreateChannelState,
  formData: FormData
): Promise<CreateChannelState> {
  const t = await getTranslations('Errors');
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { error: t('channelNameEmpty') };
  const raw = String(formData.get('visibility') ?? 'public');
  const visibility = raw === 'private' ? 'private' : 'public';

  try {
    await strapiFetch<StrapiResponse<Channel>>('/channels', {
      method: 'POST',
      body: { data: { title, visibility } },
    });
  } catch (err) {
    if (err instanceof StrapiError) {
      if (err.status === 401) return { error: t('loginRequired') };
      if (err.status === 403)
        return { error: t('createChannelForbidden') };
      if (err.status === 400) return { error: t('channelNameInvalid') };
      if (err.status >= 500) return { error: t('serviceUnavailable') };
    }
    return { error: t('createFailed') };
  }

  revalidatePath('/');
  return null;
}

export async function manageCollaborator(
  channelId: string,
  slug: string,
  username: string,
  action: 'add' | 'remove'
): Promise<{ ok: boolean; error?: string; names?: string[] }> {
  const t = await getTranslations('Errors');
  const name = username.trim();
  if (!name) return { ok: false, error: t('enterUsername') };
  try {
    const res = await strapiFetch<{ data: { collaboratorNames?: string[] } }>(
      '/channels/collaborators',
      { method: 'POST', body: { channelId, username: name, action } }
    );
    updateTag(`channel:${slug}`);
    return { ok: true, names: res.data.collaboratorNames };
  } catch (err) {
    if (err instanceof StrapiError) {
      if (err.status === 403) return { ok: false, error: t('onlyOwnerManageCollaborators') };
      if (err.status === 400) return { ok: false, error: t('userNotFoundOrNotNeeded') };
    }
    return { ok: false, error: t('actionFailed') };
  }
}

export async function deleteChannel(
  documentId: string,
  slug: string
): Promise<{ ok: boolean; error?: string }> {
  const t = await getTranslations('Errors');
  try {
    await strapiFetch(`/channels/${documentId}`, { method: 'DELETE' });
    updateTag(`channel:${slug}`);
    updateTag('feed'); // 边被清理，Feed 卡片上的引用计数已变化
    return { ok: true };
  } catch (err) {
    if (err instanceof StrapiError && err.status === 403) {
      return { ok: false, error: t('onlyOwnChannelDelete') };
    }
    return { ok: false, error: t('deleteFailed') };
  }
}

export type UpdateChannelState = { ok?: boolean; error?: string } | null;

export async function updateChannel(
  documentId: string,
  slug: string,
  _prev: UpdateChannelState,
  formData: FormData
): Promise<UpdateChannelState> {
  const t = await getTranslations('Errors');
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const raw = String(formData.get('visibility') ?? 'public');
  const visibility = ['public', 'closed', 'private'].includes(raw) ? raw : 'public';

  try {
    await strapiFetch(`/channels/${documentId}`, {
      method: 'PUT',
      body: { data: { title, description, visibility } },
    });
  } catch (err) {
    if (err instanceof StrapiError && err.status === 403) {
      return { error: t('onlyOwnChannelEdit') };
    }
    if (err instanceof StrapiError && err.status === 401) {
      return { error: t('loginRequired') };
    }
    return { error: t('saveFailed') };
  }

  updateTag(`channel:${slug}`);
  revalidatePath(`/channel/${slug}`);
  revalidatePath('/');
  revalidatePath('/explore');
  return { ok: true };
}
