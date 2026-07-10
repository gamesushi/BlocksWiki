/**
 * Notification controller —— 只读自己的通知 + 未读数 + 全部标记已读。
 * find 强制 recipientName = 当前用户，任何客户端 filters 都不能越权读别人的通知。
 */
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::notification.notification', ({ strapi }) => ({
  async find(ctx) {
    const username = ctx.state.user?.username;
    if (!username) return ctx.unauthorized();
    ctx.query = {
      ...ctx.query,
      filters: { recipientName: username },
      sort: ['createdAt:desc'],
    };
    return super.find(ctx);
  },

  async unreadCount(ctx) {
    const username = ctx.state.user?.username;
    if (!username) return ctx.unauthorized();
    const count = await strapi.documents('api::notification.notification').count({
      filters: { recipientName: username, read: false },
    });
    return { data: { count } };
  },

  async markRead(ctx) {
    const username = ctx.state.user?.username;
    if (!username) return ctx.unauthorized();
    const unread = await strapi.documents('api::notification.notification').findMany({
      filters: { recipientName: username, read: false },
      fields: ['documentId'],
      limit: -1,
    });
    for (const n of unread) {
      await strapi.documents('api::notification.notification').update({
        documentId: n.documentId,
        data: { read: true },
      });
    }
    return { data: { marked: unread.length } };
  },
}));
