/**
 * Block → Block 链接提取与 Connection 边协调。
 *
 * 设计：block 正文（Editor.js）里出现的 `/block/<id>` 超链接，在 block 保存时（生命周期钩子）
 * 被扫描，自动 upsert 成带 `targetBlock` 的 Connection 边，并维护：
 *   - source.outgoingLinkCount  本 block 链出了几个 block
 *   - target.incomingLinkCount  本 block 被几个 block 链（反链索引）
 *
 * 与 block→channel 边共用 Connection 表；block→block 边的 pairKey 以 `blk:` 前缀区分，
 * 与 channel 边（`<blockId>:<channelId>`）、频道套频道边（`chan:...`）互不冲突。
 */
import type { Core } from '@strapi/strapi';

const BLOCK_HREF_RE = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;
const BLOCK_ID_RE = /\/block\/([A-Za-z0-9]+)/i;

/** 从一段内联 HTML 中提取所有指向 /block/<id> 的 documentId（含绝对 URL） */
function extractIdsFromHtml(html: unknown): string[] {
  if (typeof html !== 'string' || !html) return [];
  const ids: string[] = [];
  let m: RegExpExecArray | null;
  BLOCK_HREF_RE.lastIndex = 0;
  while ((m = BLOCK_HREF_RE.exec(html))) {
    const mm = m[1].match(BLOCK_ID_RE);
    if (mm) ids.push(mm[1]);
  }
  return ids;
}

/** 遍历 Editor.js 内容里所有含文字的块，抽出全部内链 documentId（去重保序） */
export function extractBlockLinks(content: any): string[] {
  const blocks: any[] = content?.blocks ?? [];
  const ids: string[] = [];
  for (const b of blocks) {
    switch (b?.type) {
      case 'paragraph':
      case 'header':
      case 'quote':
        ids.push(...extractIdsFromHtml(b.data?.text));
        break;
      case 'list':
        for (const item of b.data?.items ?? []) {
          ids.push(...extractIdsFromHtml(typeof item === 'string' ? item : item?.content));
        }
        break;
      case 'image':
        ids.push(...extractIdsFromHtml(b.data?.caption));
        break;
      default:
        break;
    }
  }
  return Array.from(new Set(ids));
}

async function getCreator(strapi: Core.Strapi, blockId: string) {
  const b: any = await strapi.documents('api::block.block').findOne({
    documentId: blockId,
    populate: { creator: { fields: ['id', 'username'] } },
  });
  const c = b?.creator;
  return { id: c?.id ?? null, username: c?.username ?? b?.creatorName ?? 'unknown' };
}

/** 调整目标 block 的反链计数（仅更新计数，不碰 content，故不会触发 reconcile 级联） */
async function bumpIncoming(strapi: Core.Strapi, targetId: string, delta: number) {
  const t: any = await strapi.documents('api::block.block').findOne({
    documentId: targetId,
    fields: ['incomingLinkCount'],
  });
  const next = Math.max(0, (t?.incomingLinkCount ?? 0) + delta);
  await strapi.documents('api::block.block').update({
    documentId: targetId,
    data: { incomingLinkCount: next },
  });
}

/** 调整源 block 的出链计数 */
async function bumpOutgoing(strapi: Core.Strapi, sourceId: string, delta: number) {
  const b: any = await strapi.documents('api::block.block').findOne({
    documentId: sourceId,
    fields: ['outgoingLinkCount'],
  });
  const next = Math.max(0, (b?.outgoingLinkCount ?? 0) + delta);
  await strapi.documents('api::block.block').update({
    documentId: sourceId,
    data: { outgoingLinkCount: next },
  });
}

/**
 * 协调某 block 正文的 block→block 链接与 Connection 边。
 * - 正文里出现的每个有效 /block/<id>（去重、排除自身、目标须存在）=> 一条 targetBlock 边
 * - 正文中消失的链接 => 删除对应边并回收目标反链计数
 * - 写回 source.outgoingLinkCount
 *
 * 幂等：重复调用安全；并发双击由 pairKey 唯一索引兜底。
 */
export async function reconcileBlockLinks(
  strapi: Core.Strapi,
  block: { documentId: string; content?: any },
) {
  const selfId = block.documentId;

  // 1. 期望的目标集合（去重、排除自身、目标必须存在）
  const wanted = extractBlockLinks(block.content).filter((id) => id !== selfId);
  const validIds = new Set<string>();
  if (wanted.length) {
    const found: any[] = await strapi.documents('api::block.block').findMany({
      filters: { documentId: { $in: wanted } },
      fields: ['documentId'],
      limit: -1,
    });
    for (const f of found) validIds.add(f.documentId);
  }

  // 2. 现有 block→block 边
  const current: any[] = await strapi.documents('api::connection.connection').findMany({
    filters: { block: { documentId: selfId }, pairKey: { $startsWith: 'blk:' } },
    fields: ['documentId', 'pairKey'],
    populate: { targetBlock: { fields: ['documentId'] } },
    limit: -1,
  });
  const currentTargets = new Map<string, string>(); // targetId -> connDocumentId
  for (const c of current) {
    const tid = c.targetBlock?.documentId;
    if (tid) currentTargets.set(tid, c.documentId);
  }

  const creator = await getCreator(strapi, selfId);

  // 3. 新增缺失边（仅在实际创建时回收反链计数，避免重复 +1）
  for (const tid of validIds) {
    if (currentTargets.has(tid)) continue;
    const pairKey = `blk:${selfId}:${tid}`;
    const ex = await strapi.documents('api::connection.connection').findFirst({ filters: { pairKey } });
    if (!ex) {
      try {
        await strapi.documents('api::connection.connection').create({
          data: {
            block: selfId,
            targetBlock: tid,
            connector: creator.id ?? undefined,
            connectorName: creator.username,
            position: 0,
            pairKey,
          },
        });
        await bumpIncoming(strapi, tid, +1);
      } catch (err: any) {
        // pairKey 唯一索引并发兜底
        if (!String(err?.message).includes('unique') && err?.code !== '23505') throw err;
      }
    }
  }

  // 4. 删除消失边
  for (const [tid, connId] of currentTargets) {
    if (validIds.has(tid)) continue;
    await strapi.documents('api::connection.connection').delete({ documentId: connId });
    await bumpIncoming(strapi, tid, -1);
  }

  // 5. 写回 source 出链计数（与现状对齐，含 0）
  await strapi.documents('api::block.block').update({
    documentId: selfId,
    data: { outgoingLinkCount: validIds.size },
  });
}

/**
 * Block 删除后清理以其为源或目标的 block→block / block→channel 边，并回收反链计数。
 * 频道块的边（block 为 null、contentChannel 有值）是合法边，由 lifecycles.ts 的孤儿清理处理。
 */
export async function cleanupBlockConnections(strapi: Core.Strapi, deletedId: string) {
  const asSource: any[] = await strapi.documents('api::connection.connection').findMany({
    filters: { block: { documentId: deletedId } },
    populate: { targetBlock: { fields: ['documentId'] } },
    limit: -1,
  });
  for (const c of asSource) {
    if (c.targetBlock?.documentId) await bumpIncoming(strapi, c.targetBlock.documentId, -1);
  }

  const asTarget: any[] = await strapi.documents('api::connection.connection').findMany({
    filters: { targetBlock: { documentId: deletedId } },
    populate: { block: { fields: ['documentId'] } },
    limit: -1,
  });
  for (const c of asTarget) {
    if (c.block?.documentId) await bumpOutgoing(strapi, c.block.documentId, -1);
  }

  const allIds = [...asSource, ...asTarget].map((c) => c.documentId).filter(Boolean);
  if (allIds.length) {
    await strapi.db.query('api::connection.connection').deleteMany({
      where: { documentId: { $in: allIds } },
    });
  }
}
