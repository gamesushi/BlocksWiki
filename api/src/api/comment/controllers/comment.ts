/**
 * Comment controller —— Block 下的评论。
 * create：仅登录用户，作者名反规范化，维护 Block.commentCount，通知 Block 作者。
 * delete：仅评论作者本人；递减 commentCount。
 * find 沿用核心路由（评论无隐私维度，跟随所属 Block 公开可读）。
 */
import { factories } from '@strapi/strapi';
import { notify } from '../../../utils/notify';

export default factories.createCoreController('api::comment.comment', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('登录后才能评论。');

    const { body, blockId } = ctx.request.body?.data ?? {};
    if (typeof body !== 'string' || !body.trim()) {
      return ctx.badRequest('评论内容不能为空。');
    }
    if (body.length > 2000) return ctx.badRequest('评论过长（上限 2000 字）。');
    if (typeof blockId !== 'string') return ctx.badRequest('blockId 必填。');

    const block = await strapi.documents('api::block.block').findOne({
      documentId: blockId,
      fields: ['id', 'commentCount', 'creatorName'],
    });
    if (!block) return ctx.notFound('Block 不存在。');

    const created = await strapi.documents('api::comment.comment').create({
      data: {
        body: body.trim(),
        authorName: user.username,
        block: blockId,
      },
      fields: ['documentId', 'body', 'authorName', 'createdAt'],
    });

    await strapi.documents('api::block.block').update({
      documentId: blockId,
      data: { commentCount: (block.commentCount ?? 0) + 1 },
    });

    await notify(strapi, {
      recipientName: (block as any).creatorName,
      actorName: user.username,
      type: 'comment_on_block',
      targetBlockId: blockId,
    });

    ctx.status = 201;
    return { data: created };
  },

  /** 删除评论：仅评论作者本人；递减所属 Block 的 commentCount。 */
  async delete(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const documentId = ctx.params.id;
    const comment = await strapi.documents('api::comment.comment').findOne({
      documentId,
      populate: { block: { fields: ['documentId', 'commentCount'] } },
    });
    if (!comment) return ctx.notFound();
    if (comment.authorName !== user.username) {
      return ctx.forbidden('只能删除自己发布的评论。');
    }

    if (comment.block) {
      await strapi.documents('api::block.block').update({
        documentId: comment.block.documentId,
        data: { commentCount: Math.max(0, (comment.block.commentCount ?? 1) - 1) },
      });
    }

    await strapi.documents('api::comment.comment').delete({ documentId });
    return { data: { documentId, deleted: true } };
  },
}));
