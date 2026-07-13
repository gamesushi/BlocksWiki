/**
 * Block controller
 * 覆盖 create：creator 一律由服务端注入（绝不信任前端传入的作者字段），
 * content 必须是 Editor.js OutputData 形状的 JSON。
 */
import { factories } from '@strapi/strapi';

type EditorJsBlock = { id?: string; type: string; data: Record<string, any> };
type EditorJsOutput = { time?: number; version?: string; blocks: EditorJsBlock[] };

function isEditorJsOutput(value: unknown): value is EditorJsOutput {
  if (!value || typeof value !== 'object') return false;
  const blocks = (value as EditorJsOutput).blocks;
  return (
    Array.isArray(blocks) &&
    blocks.every(
      (b) => b && typeof b === 'object' && typeof b.type === 'string' && typeof b.data === 'object'
    )
  );
}

/**
 * 来源溯源：把任意前端传入的 sourceUrl 收敛成安全的 http(s) URL（或 null）。
 * 过滤 javascript: 等危险协议、超长与非法串——即便前端被绕过也不会落脏数据。
 */
function sanitizeSourceUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

export default factories.createCoreController('api::block.block', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('登录后才能发布 Block。');

    const { content, blockType, sourceUrl } = ctx.request.body?.data ?? {};
    if (!isEditorJsOutput(content)) {
      return ctx.badRequest('content 必须是 Editor.js OutputData JSON（{ blocks: [...] }）。');
    }
    if (content.blocks.length === 0) {
      return ctx.badRequest('不能发布空 Block。');
    }
    // 来源溯源：仅接受 http(s) 的 sourceUrl，非法则丢弃（不报错，保持创建成功）
    const safeSourceUrl = sanitizeSourceUrl(sourceUrl);

    const created = await strapi.documents('api::block.block').create({
      data: {
        content,
        blockType: blockType ?? 'text',
        creator: user.id, // excerpt / coverImageUrl 由 lifecycle 反规范化生成
        // 反规范化：匿名访客读详情页时 user 关系会被 sanitize 掉
        creatorName: user.username,
        ...(safeSourceUrl ? { sourceUrl: safeSourceUrl } : {}),
      },
      populate: { creator: { fields: ['id', 'username'] } },
    });

    ctx.status = 201;
    return { data: created };
  },

  /** 编辑 Block：仅作者本人，只允许改 content（creator/creatorName 不可变）。
   *  excerpt / coverImageUrl / searchText 由 beforeUpdate lifecycle 重算。 */
  async update(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('登录后才能编辑 Block。');

    const documentId = ctx.params.id;
    const { content, blockType } = ctx.request.body?.data ?? {};
    if (!isEditorJsOutput(content)) {
      return ctx.badRequest('content 必须是 Editor.js OutputData JSON（{ blocks: [...] }）。');
    }
    if (content.blocks.length === 0) {
      return ctx.badRequest('不能保存空 Block。');
    }

    const block = await strapi.documents('api::block.block').findOne({
      documentId,
      populate: { creator: { fields: ['id'] } },
    });
    if (!block) return ctx.notFound();
    if (block.creator?.id !== user.id) {
      return ctx.forbidden('只能编辑自己发布的 Block。');
    }

    const updated = await strapi.documents('api::block.block').update({
      documentId,
      data: { content, ...(blockType ? { blockType } : {}) },
      populate: { creator: { fields: ['id', 'username'] } },
    });
    return { data: updated };
  },

  /** 编辑 Block 描述：独立于正文，仅作者本人。空字符串等价清空描述。 */
  async updateDescription(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('登录后才能编辑描述。');

    const documentId = ctx.params.id;
    const { description } = ctx.request.body?.data ?? {};
    if (typeof description !== 'string') {
      return ctx.badRequest('description 必须是字符串。');
    }
    if (description.length > 2000) {
      return ctx.badRequest('描述过长（上限 2000 字）。');
    }

    const block = await strapi.documents('api::block.block').findOne({
      documentId,
      populate: { creator: { fields: ['id'] } },
    });
    if (!block) return ctx.notFound();
    if (block.creator?.id !== user.id) {
      return ctx.forbidden('只能编辑自己发布的 Block。');
    }

    const updated = await strapi.documents('api::block.block').update({
      documentId,
      data: { description: description.trim() },
      fields: ['documentId', 'description'],
    });
    return { data: updated };
  },

  /** 删除 Block：仅作者本人；先删它的所有边（不留幽灵边），再删本体 */
  async delete(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const documentId = ctx.params.id;
    const block = await strapi.documents('api::block.block').findOne({
      documentId,
      populate: { creator: { fields: ['id'] } },
    });
    if (!block) return ctx.notFound();
    if (block.creator?.id !== user.id) {
      return ctx.forbidden('只能删除自己发布的 Block。');
    }

    const connections = await strapi.documents('api::connection.connection').findMany({
      filters: { block: { documentId } },
      populate: { channel: { fields: ['documentId', 'connectionCount'] } },
      limit: -1,
    });
    for (const conn of connections) {
      // 递减被挂载频道的计数缓存，再删边
      if (conn.channel) {
        await strapi.documents('api::channel.channel').update({
          documentId: conn.channel.documentId,
          data: { connectionCount: Math.max(0, (conn.channel.connectionCount ?? 1) - 1) },
        });
      }
      await strapi.documents('api::connection.connection').delete({
        documentId: conn.documentId,
      });
    }

    const comments = await strapi.documents('api::comment.comment').findMany({
      filters: { block: { documentId } },
      fields: ['documentId'],
      limit: -1,
    });
    for (const c of comments) {
      await strapi.documents('api::comment.comment').delete({ documentId: c.documentId });
    }

    await strapi.documents('api::block.block').delete({ documentId });
    return {
      data: {
        documentId,
        deleted: true,
        removedConnections: connections.length,
        removedComments: comments.length,
      },
    };
  },
}));
