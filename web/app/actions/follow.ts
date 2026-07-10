'use server';

import { revalidatePath } from 'next/cache';
import { strapiFetch, StrapiError, type StrapiResponse } from '@/lib/strapi';
import { getSession } from '@/app/actions/auth';
import { FEED_PAGE_SIZE } from '@/lib/blocks-query';
import type { Connection } from '@/lib/types';

export async function followUser(
  username: string,
  action: 'follow' | 'unfollow'
): Promise<{ ok: boolean; error?: string }> {
  try {
    await strapiFetch('/follow/user', { method: 'POST', body: { username, action } });
    revalidatePath(`/user/${username}`);
    revalidatePath('/feed');
    return { ok: true };
  } catch (err) {
    if (err instanceof StrapiError && err.status === 401) return { ok: false, error: '请先登录。' };
    return { ok: false, error: '操作失败，请重试。' };
  }
}

export async function followChannel(
  channelId: string,
  slug: string,
  action: 'follow' | 'unfollow'
): Promise<{ ok: boolean; error?: string }> {
  try {
    await strapiFetch('/follow/channel', { method: 'POST', body: { channelId, action } });
    revalidatePath(`/channel/${slug}`);
    revalidatePath('/feed');
    return { ok: true };
  } catch (err) {
    if (err instanceof StrapiError) {
      if (err.status === 401) return { ok: false, error: '请先登录。' };
      if (err.status === 403) return { ok: false, error: '无权关注该私密频道。' };
    }
    return { ok: false, error: '操作失败，请重试。' };
  }
}

export type FeedPage = { items: Connection[]; hasMore: boolean; page: number };

/**
 * 动态流：被关注用户的连结 + 连入被关注频道的边，按时间倒序。
 * 以 Connection 为活动单元（"X 把 [内容] 连进了 [频道]"）。private 由 connection.find 过滤。
 */
export async function getFeed(page: number): Promise<FeedPage> {
  const session = await getSession();
  if (!session) return { items: [], hasMore: false, page };
  const { following, followedChannelIds } = session;
  if (following.length === 0 && followedChannelIds.length === 0) {
    return { items: [], hasMore: false, page };
  }

  const qs = new URLSearchParams({
    'sort[0]': 'createdAt:desc',
    'pagination[page]': String(page),
    'pagination[pageSize]': String(FEED_PAGE_SIZE),
    'fields[0]': 'connectorName',
    'fields[1]': 'createdAt',
    'populate[block][fields][0]': 'documentId',
    'populate[block][fields][1]': 'excerpt',
    'populate[block][fields][2]': 'coverImageUrl',
    'populate[channel][fields][0]': 'title',
    'populate[channel][fields][1]': 'slug',
    'populate[contentChannel][fields][0]': 'title',
    'populate[contentChannel][fields][1]': 'slug',
  });
  let oi = 0;
  following.forEach((name) => qs.append(`filters[$or][${oi++}][connectorName][$eq]`, name));
  followedChannelIds.forEach((id) =>
    qs.append(`filters[$or][${oi++}][channel][documentId][$eq]`, id)
  );

  try {
    const res = await strapiFetch<StrapiResponse<Connection[]>>(`/connections?${qs}`, { revalidate: 0 });
    const total = res.meta?.pagination?.total ?? 0;
    return { items: res.data, page, hasMore: page * FEED_PAGE_SIZE < total };
  } catch {
    return { items: [], hasMore: false, page };
  }
}
