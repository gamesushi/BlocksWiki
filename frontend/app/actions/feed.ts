'use server';

import { strapiFetch, type StrapiResponse } from '@/lib/strapi';
import { blockGridFieldParams, FEED_PAGE_SIZE } from '@/lib/blocks-query';
import type { Block } from '@/lib/types';

export type BlockPage = { blocks: Block[]; hasMore: boolean; page: number };

/** Feed 下一页（"加载更多"）。首屏在服务端组件里渲染，此处只取第 2 页起 */
export async function loadFeedPage(page: number): Promise<BlockPage> {
  const qs = new URLSearchParams({
    'sort[0]': 'createdAt:desc',
    'pagination[page]': String(page),
    'pagination[pageSize]': String(FEED_PAGE_SIZE),
  });
  blockGridFieldParams(qs);

  const res = await strapiFetch<StrapiResponse<Block[]>>(`/blocks?${qs}`, {
    tags: ['feed'],
    revalidate: 60,
  });
  const total = res.meta?.pagination?.total ?? 0;
  return { blocks: res.data, page, hasMore: page * FEED_PAGE_SIZE < total };
}
