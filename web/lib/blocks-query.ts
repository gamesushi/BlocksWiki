/** Feed / 搜索 / 用户页共用的 Block 网格查询字段（保持一致，防止某页漏字段） */
export const BLOCK_GRID_FIELDS = [
  'excerpt',
  'coverImageUrl',
  'blockType',
  'connectionCount',
  'commentCount',
  'creatorName',
  'sourceUrl',
] as const;

export const FEED_PAGE_SIZE = 24;

export function blockGridFieldParams(qs: URLSearchParams) {
  BLOCK_GRID_FIELDS.forEach((f, i) => qs.set(`fields[${i}]`, f));
  return qs;
}
