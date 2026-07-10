'use server';

import { updateTag } from 'next/cache';
import { strapiFetch, StrapiError, type StrapiResponse } from '@/lib/strapi';
import { FEED_PAGE_SIZE } from '@/lib/blocks-query';
import { textToContent } from '@/lib/editorjs-text';
import type { Block, Connection, EditorJsOutput } from '@/lib/types';

/**
 * Are.na 式就地新建：创建 Block（Editor.js content）并连结到本频道。
 * 一次动作两步（建 Block + connect），失败信息回传给磁贴。
 * content 由客户端构造：纯文本 / markdown / URL / 上传图片皆归一为 Editor.js OutputData。
 */
export async function addBlockToChannel(
  channelId: string,
  slug: string,
  content: EditorJsOutput,
  blockType: 'text' | 'image' | 'link' = 'text'
): Promise<{ ok: boolean; error?: string }> {
  if (!content?.blocks?.length) return { ok: false, error: '内容为空。' };

  try {
    const blockRes = await strapiFetch<StrapiResponse<Block>>('/blocks', {
      method: 'POST',
      body: { data: { content, blockType } },
    });
    await strapiFetch('/connections/connect', {
      method: 'POST',
      body: { blockId: blockRes.data.documentId, channelId },
    });
    updateTag(`channel:${slug}`);
    updateTag('feed');
    return { ok: true };
  } catch (err) {
    if (err instanceof StrapiError) {
      if (err.status === 401) return { ok: false, error: '请先登录。' };
      if (err.status === 403) return { ok: false, error: '无权向该频道添加内容。' };
    }
    return { ok: false, error: '添加失败，请重试。' };
  }
}

/** 纯文本便捷入口（磁贴快速输入用） */
export async function addTextToChannel(channelId: string, slug: string, text: string) {
  return addBlockToChannel(channelId, slug, textToContent(text), 'text');
}

/** 把「当前频道」作为频道块连入「目标频道」（Are.na 频道套频道）。 */
export async function connectChannelToChannel(
  contentChannelId: string,
  targetChannelId: string,
  targetSlug: string
): Promise<{ ok: boolean; error?: string; duplicated?: boolean }> {
  try {
    const res = await strapiFetch<{ meta?: { duplicated?: boolean } }>('/connections/connect-channel', {
      method: 'POST',
      body: { contentChannelId, targetChannelId },
    });
    updateTag(`channel:${targetSlug}`);
    return { ok: true, duplicated: !!res.meta?.duplicated };
  } catch (err) {
    if (err instanceof StrapiError) {
      if (err.status === 401) return { ok: false, error: '请先登录。' };
      if (err.status === 403) return { ok: false, error: '无权连结到该频道。' };
      if (err.status === 400) return { ok: false, error: '频道不能连结到自身。' };
      if (err.status === 409) return { ok: false, error: '已经连结过了。' };
    }
    return { ok: false, error: '连结失败，请重试。' };
  }
}

/** 当前频道出现在哪些频道里（This channel appears in）。private 容器由后端过滤。 */
export async function getChannelAppearances(
  channelId: string
): Promise<{ documentId: string; title: string; slug: string }[]> {
  const qs = new URLSearchParams({
    'filters[contentChannel][documentId][$eq]': channelId,
    'sort[0]': 'createdAt:desc',
    'pagination[pageSize]': '30',
    'fields[0]': 'connectorName',
    'populate[channel][fields][0]': 'title',
    'populate[channel][fields][1]': 'slug',
  });
  try {
    const res = await strapiFetch<StrapiResponse<Connection[]>>(`/connections?${qs}`, { revalidate: 0 });
    return res.data
      .map((c) => c.channel)
      .filter((ch): ch is NonNullable<typeof ch> => !!ch)
      .map((ch) => ({ documentId: ch.documentId, title: ch.title, slug: ch.slug }));
  } catch {
    return [];
  }
}

export type ConnectionPage = { connections: Connection[]; hasMore: boolean; page: number };

/** 频道页某一页的边。position desc = Are.na 式新连结排最前 */
export async function loadChannelConnections(
  channelId: string,
  slug: string,
  page: number
): Promise<ConnectionPage> {
  const qs = new URLSearchParams({
    'filters[channel][documentId][$eq]': channelId,
    'sort[0]': 'position:desc',
    'pagination[page]': String(page),
    'pagination[pageSize]': String(FEED_PAGE_SIZE),
    'fields[0]': 'position',
    'fields[1]': 'connectorName',
    'fields[2]': 'createdAt',
    'populate[block][fields][0]': 'excerpt',
    'populate[block][fields][1]': 'coverImageUrl',
    'populate[block][fields][2]': 'blockType',
    'populate[block][fields][3]': 'connectionCount',
    'populate[contentChannel][fields][0]': 'title',
    'populate[contentChannel][fields][1]': 'slug',
    'populate[contentChannel][fields][2]': 'ownerName',
    'populate[contentChannel][fields][3]': 'connectionCount',
  });
  const res = await strapiFetch<StrapiResponse<Connection[]>>(`/connections?${qs}`, {
    tags: [`channel:${slug}`],
    revalidate: 300,
  });
  const total = res.meta?.pagination?.total ?? 0;
  return { connections: res.data, page, hasMore: page * FEED_PAGE_SIZE < total };
}
