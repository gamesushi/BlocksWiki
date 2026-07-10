'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { strapiFetch, StrapiError, type StrapiResponse } from '@/lib/strapi';
import type { Block, Channel, EditorJsOutput, WikiItem, WikiPage, WikiTreeNode } from '@/lib/types';

export async function getWikiTree(): Promise<WikiTreeNode[]> {
  try {
    const res = await strapiFetch<{ data: WikiTreeNode[] }>('/wiki-pages/tree', {
      tags: ['wiki'],
      revalidate: 120,
    });
    return res.data;
  } catch {
    return [];
  }
}

export async function getWikiPage(slug: string): Promise<WikiPage | null> {
  try {
    const res = await strapiFetch<StrapiResponse<WikiPage[]>>(
      `/wiki-pages?filters[slug][$eq]=${encodeURIComponent(slug)}&populate[parent][fields][0]=title&populate[parent][fields][1]=slug`,
      { tags: ['wiki', `wiki:${slug}`], revalidate: 120 }
    );
    return res.data[0] ?? null;
  } catch {
    return null;
  }
}

export type ResolvedItem =
  | { type: 'text'; content: EditorJsOutput }
  | { type: 'block'; note?: string; block: Block | null }
  | { type: 'channel'; note?: string; channel: Channel | null };

/**
 * 批量解析 items 里的 block/channel 引用（一次 $in 查询，零 N+1）。
 * 引用已删除或（private 频道）无权可见 → resolved 为 null，前端渲染占位符。
 */
export async function resolveWikiItems(items: WikiItem[]): Promise<ResolvedItem[]> {
  const blockIds = items.filter((i) => i.type === 'block').map((i: any) => i.blockId);
  const channelIds = items.filter((i) => i.type === 'channel').map((i: any) => i.channelId);

  const blockMap = new Map<string, Block>();
  const channelMap = new Map<string, Channel>();

  if (blockIds.length > 0) {
    const qs = new URLSearchParams({ 'pagination[pageSize]': '100' });
    blockIds.forEach((id, i) => qs.append(`filters[documentId][$in][${i}]`, id));
    qs.append('fields[0]', 'excerpt');
    qs.append('fields[1]', 'coverImageUrl');
    qs.append('fields[2]', 'creatorName');
    qs.append('fields[3]', 'connectionCount');
    // content 是 JSON 标量字段，用 fields 选取（不是关系，不能 populate）
    qs.append('fields[4]', 'content');
    try {
      const res = await strapiFetch<StrapiResponse<Block[]>>(`/blocks?${qs}`, { tags: ['wiki'] });
      for (const b of res.data) blockMap.set(b.documentId, b);
    } catch {}
  }

  if (channelIds.length > 0) {
    const qs = new URLSearchParams({ 'pagination[pageSize]': '100' });
    channelIds.forEach((id, i) => qs.append(`filters[documentId][$in][${i}]`, id));
    qs.append('fields[0]', 'title');
    qs.append('fields[1]', 'slug');
    qs.append('fields[2]', 'ownerName');
    qs.append('fields[3]', 'connectionCount');
    qs.append('fields[4]', 'visibility');
    try {
      // channel.find 会自动过滤无权可见的 private 频道
      const res = await strapiFetch<StrapiResponse<Channel[]>>(`/channels?${qs}`, { tags: ['wiki'] });
      for (const c of res.data) channelMap.set(c.documentId, c);
    } catch {}
  }

  return items.map((it): ResolvedItem => {
    if (it.type === 'text') return { type: 'text', content: it.content as any };
    if (it.type === 'block') return { type: 'block', note: it.note, block: blockMap.get(it.blockId) ?? null };
    return { type: 'channel', note: it.note, channel: channelMap.get(it.channelId) ?? null };
  });
}

export type WikiWriteResult = { ok: true; slug: string } | { ok: false; error: string };

function mapWriteError(err: unknown): WikiWriteResult {
  if (err instanceof StrapiError) {
    if (err.status === 403) return { ok: false, error: '仅管理员可编排 Wiki。' };
    if (err.status === 400) return { ok: false, error: '内容结构非法。' };
  }
  return { ok: false, error: '保存失败，请重试。' };
}

export async function createWikiPage(data: {
  title: string;
  intro?: unknown;
  items?: WikiItem[];
  published?: boolean;
  parent?: string | null;
  order?: number;
}): Promise<WikiWriteResult> {
  try {
    const res = await strapiFetch<StrapiResponse<WikiPage>>('/wiki-pages', {
      method: 'POST',
      body: { data },
    });
    updateTag('wiki');
    revalidatePath('/wiki');
    return { ok: true, slug: res.data.slug };
  } catch (err) {
    return mapWriteError(err);
  }
}

export async function updateWikiPage(
  documentId: string,
  slug: string,
  data: {
    title?: string;
    intro?: unknown;
    items?: WikiItem[];
    published?: boolean;
    parent?: string | null;
    order?: number;
  }
): Promise<WikiWriteResult> {
  try {
    const res = await strapiFetch<StrapiResponse<WikiPage>>(`/wiki-pages/${documentId}`, {
      method: 'PUT',
      body: { data },
    });
    updateTag('wiki');
    updateTag(`wiki:${slug}`);
    revalidatePath('/wiki');
    return { ok: true, slug: res.data.slug };
  } catch (err) {
    return mapWriteError(err);
  }
}

export async function deleteWikiPage(documentId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await strapiFetch(`/wiki-pages/${documentId}`, { method: 'DELETE' });
    updateTag('wiki');
    revalidatePath('/wiki');
    return { ok: true };
  } catch (err) {
    const r = mapWriteError(err);
    return { ok: false, error: r.ok ? undefined : r.error };
  }
}
