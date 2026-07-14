'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { strapiFetch, StrapiError, type StrapiResponse } from '@/lib/strapi';
import type { Channel } from '@/lib/types';

export type CreateChannelState = { error: string } | null;

export async function createChannel(
  _prev: CreateChannelState,
  formData: FormData
): Promise<CreateChannelState> {
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { error: 'Channel 名称不能为空。' };
  const raw = String(formData.get('visibility') ?? 'public');
  const visibility = raw === 'private' ? 'private' : 'public';

  try {
    await strapiFetch<StrapiResponse<Channel>>('/channels', {
      method: 'POST',
      body: { data: { title, visibility } },
    });
  } catch (err) {
    if (err instanceof StrapiError) {
      if (err.status === 401) return { error: '请先登录。' };
      if (err.status === 403)
        return { error: '权限不足，无法创建频道（账号角色缺少 channel.create 权限）。' };
      if (err.status === 400) return { error: '提交内容不合法，请检查频道名称。' };
      if (err.status >= 500) return { error: '服务暂时不可用，请稍后重试。' };
    }
    return { error: '创建失败，请重试。' };
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
  const name = username.trim();
  if (!name) return { ok: false, error: '请输入用户名。' };
  try {
    const res = await strapiFetch<{ data: { collaboratorNames?: string[] } }>(
      '/channels/collaborators',
      { method: 'POST', body: { channelId, username: name, action } }
    );
    updateTag(`channel:${slug}`);
    return { ok: true, names: res.data.collaboratorNames };
  } catch (err) {
    if (err instanceof StrapiError) {
      if (err.status === 403) return { ok: false, error: '只有属主可以管理协作者。' };
      if (err.status === 400) return { ok: false, error: '该用户不存在或无需添加。' };
    }
    return { ok: false, error: '操作失败，请重试。' };
  }
}

export async function deleteChannel(
  documentId: string,
  slug: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await strapiFetch(`/channels/${documentId}`, { method: 'DELETE' });
    updateTag(`channel:${slug}`);
    updateTag('feed'); // 边被清理，Feed 卡片上的引用计数已变化
    return { ok: true };
  } catch (err) {
    if (err instanceof StrapiError && err.status === 403) {
      return { ok: false, error: '只能删除自己的 Channel。' };
    }
    return { ok: false, error: '删除失败，请重试。' };
  }
}

export type UpdateChannelState = { ok?: boolean; error?: string } | null;

export async function updateChannel(
  documentId: string,
  slug: string,
  _prev: UpdateChannelState,
  formData: FormData
): Promise<UpdateChannelState> {
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
      return { error: '只能编辑自己的 Channel。' };
    }
    if (err instanceof StrapiError && err.status === 401) {
      return { error: '请先登录。' };
    }
    return { error: '保存失败，请重试。' };
  }

  updateTag(`channel:${slug}`);
  revalidatePath(`/channel/${slug}`);
  revalidatePath('/');
  revalidatePath('/explore');
  return { ok: true };
}
