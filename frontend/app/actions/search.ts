'use server';

import { strapiFetch, type StrapiResponse } from '@/lib/strapi';
import { blockGridFieldParams, FEED_PAGE_SIZE } from '@/lib/blocks-query';
import type { Block, Channel } from '@/lib/types';

export type SearchBlockPage = { blocks: Block[]; hasMore: boolean; page: number };

/**
 * Block 全文搜索：对反规范化的 searchText 做 $containsi（SQL LIKE，大小写不敏感）。
 * 中文子串无需分词，LIKE 即正解。private 频道不涉及（Block 本身无 visibility）。
 */
export async function searchBlocks(query: string, page: number): Promise<SearchBlockPage> {
  const q = query.trim();
  if (!q) return { blocks: [], hasMore: false, page };

  const qs = new URLSearchParams({
    'filters[searchText][$containsi]': q,
    'sort[0]': 'connectionCount:desc',
    'sort[1]': 'createdAt:desc',
    'pagination[page]': String(page),
    'pagination[pageSize]': String(FEED_PAGE_SIZE),
  });
  blockGridFieldParams(qs);

  const res = await strapiFetch<StrapiResponse<Block[]>>(`/blocks?${qs}`, { revalidate: 0 });
  const total = res.meta?.pagination?.total ?? 0;
  return { blocks: res.data, page, hasMore: page * FEED_PAGE_SIZE < total };
}

export type ConnectableChannel = { documentId: string; title: string; slug: string; ownerName: string };

/**
 * Connect 选择器的频道搜索：只返回公开频道（任何登录用户可连）。
 * 自己的私密/closed 频道走 session 传入的 myChannels 快捷列表，不在此搜。
 */
export async function searchConnectableChannels(query: string): Promise<ConnectableChannel[]> {
  const q = query.trim();
  if (!q) return [];
  const qs = new URLSearchParams({
    'filters[visibility][$eq]': 'public',
    'filters[title][$containsi]': q,
    'sort[0]': 'connectionCount:desc',
    'pagination[pageSize]': '8',
    'fields[0]': 'title',
    'fields[1]': 'slug',
    'fields[2]': 'ownerName',
  });
  const res = await strapiFetch<StrapiResponse<Channel[]>>(`/channels?${qs}`, { revalidate: 0 });
  return res.data.map((c) => ({
    documentId: c.documentId,
    title: c.title,
    slug: c.slug,
    ownerName: c.ownerName,
  }));
}

/** 频道搜索：标题或描述命中；private 频道由后端 channel.find 自动过滤 */
export async function searchChannels(query: string): Promise<Channel[]> {
  const q = query.trim();
  if (!q) return [];

  const qs = new URLSearchParams({
    'filters[$or][0][title][$containsi]': q,
    'filters[$or][1][description][$containsi]': q,
    'sort[0]': 'connectionCount:desc',
    'pagination[pageSize]': '12',
    'fields[0]': 'title',
    'fields[1]': 'slug',
    'fields[2]': 'ownerName',
    'fields[3]': 'connectionCount',
    'fields[4]': 'visibility',
  });
  const res = await strapiFetch<StrapiResponse<Channel[]>>(`/channels?${qs}`, { revalidate: 0 });
  return res.data;
}
