/**
 * Connection controller — 平台灵魂功能所在。
 *
 * POST /api/connections/connect
 * body: { blockId: string (documentId), channelId: string (documentId) }
 *
 * 语义：当前登录用户把任意可见 Block 挂载到自己的某个 Channel。
 * 不复制、不修改原 Block —— 只新增一条图的边（Connection 记录）。
 */
import { factories } from '@strapi/strapi';
import { notify } from '../../../utils/notify';

/** private 频道对属主 + 协作者可见；非 private 一律可见 */
export function canViewPrivateChannel(
  ch: { visibility?: string; ownerName?: string; collaboratorNames?: string[] },
  username?: string
): boolean {
  if (ch.visibility !== 'private') return true;
  if (!username) return false;
  return ch.ownerName === username || (ch.collaboratorNames ?? []).includes(username);
}

export default factories.createCoreController('api::connection.connection', ({ strapi }) => ({
  /**
   * find 覆盖：堵住 private 频道的两个内容泄漏面 ——
   * 1. 频道页查询（filters[channel]）：private 且非属主 → 403；
   * 2. Block 详情页侧栏（populate channel）：结果里滤掉非属主的 private 频道边。
   */
  async find(ctx) {
    const username = ctx.state.user?.username;

    // $eq 与 $in 两种频道过滤都要防：收集全部目标 id，剔除非属主的 private
    const channelFilter = (ctx.query as any)?.filters?.channel?.documentId;
    const targetIds: string[] = [];
    if (typeof channelFilter?.$eq === 'string') targetIds.push(channelFilter.$eq);
    if (Array.isArray(channelFilter?.$in)) targetIds.push(...channelFilter.$in);

    if (targetIds.length > 0) {
      const channels = await strapi.documents('api::channel.channel').findMany({
        filters: { documentId: { $in: targetIds } },
        fields: ['visibility', 'ownerName', 'collaboratorNames'],
        limit: -1,
      });
      const blocked = new Set(
        channels
          .filter((ch) => !canViewPrivateChannel(ch as any, username))
          .map((ch) => ch.documentId)
      );
      if (blocked.size > 0) {
        if (typeof channelFilter.$eq === 'string' && blocked.has(channelFilter.$eq)) {
          return ctx.forbidden('该频道为私密。');
        }
        if (Array.isArray(channelFilter.$in)) {
          channelFilter.$in = channelFilter.$in.filter((id: string) => !blocked.has(id));
          if (channelFilter.$in.length === 0) {
            return { data: [], meta: { pagination: { page: 1, pageSize: 0, pageCount: 0, total: 0 } } };
          }
        }
      }
    }

    // 强制 channel populate 携带 visibility/ownerName/collaboratorNames，过滤不被客户端 fields 绕过
    const forceVisFields = (pop: any) => {
      if (pop && Array.isArray(pop.fields)) {
        for (const f of ['visibility', 'ownerName', 'collaboratorNames']) {
          if (!pop.fields.includes(f)) pop.fields.push(f);
        }
      }
    };
    forceVisFields((ctx.query as any)?.populate?.channel);
    forceVisFields((ctx.query as any)?.populate?.contentChannel);

    const response = await super.find(ctx);
    if (Array.isArray(response?.data)) {
      response.data = response.data.filter((conn: any) => {
        // 容器频道与「频道块」内容都要过滤：任一为无权私密则隐藏该边
        if (conn.channel?.visibility && !canViewPrivateChannel(conn.channel, username)) return false;
        if (conn.contentChannel?.visibility && !canViewPrivateChannel(conn.contentChannel, username)) return false;
        return true;
      });
    }
    return response;
  },

  async connect(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('登录后才能连结 Block。');
    }

    const { blockId, channelId } = ctx.request.body ?? {};
    if (typeof blockId !== 'string' || typeof channelId !== 'string') {
      return ctx.badRequest('blockId 与 channelId（documentId）均为必填。');
    }

    // 1. 目标 Channel 必须存在，且当前用户有连结权：
    //    public → 任何登录用户；closed/private → 属主或协作者。
    //    （controller 内 populate 不经 API sanitize，可直读 owner/collaborators id）
    const channel = await strapi.documents('api::channel.channel').findOne({
      documentId: channelId,
      fields: ['connectionCount', 'visibility', 'ownerName', 'title', 'slug'],
      populate: { owner: { fields: ['id'] }, collaborators: { fields: ['id'] } },
    });
    if (!channel) return ctx.notFound('Channel 不存在。');
    const isOwner = channel.owner?.id === user.id;
    const isCollaborator = (channel.collaborators ?? []).some((c: any) => c.id === user.id);
    const canConnect = channel.visibility === 'public' || isOwner || isCollaborator;
    if (!canConnect) {
      return ctx.forbidden('无权向该 Channel 连结内容。');
    }

    // 2. 源 Block 必须存在。注意：这里只读取，绝不写入 —— Block 保持无污染
    const block = await strapi.documents('api::block.block').findOne({
      documentId: blockId,
      fields: ['id', 'connectionCount', 'creatorName'],
    });
    if (!block) return ctx.notFound('Block 不存在。');

    // 3. 幂等去重：pairKey 上有数据库唯一索引兜底，这里先做友好检查
    const pairKey = `${blockId}:${channelId}`;
    const existing = await strapi.documents('api::connection.connection').findFirst({
      filters: { pairKey },
    });
    if (existing) {
      ctx.status = 200;
      return { data: existing, meta: { duplicated: true } };
    }

    // 4. 计算 Channel 内排序位（Are.na 式：新连结排最前）
    const count = await strapi.documents('api::connection.connection').count({
      filters: { channel: { documentId: channelId } },
    });

    try {
      const created = await strapi.documents('api::connection.connection').create({
        data: {
          block: blockId,
          channel: channelId,
          connector: user.id,
          // 反规范化：匿名访客读 Channel 页时 user 关系会被 sanitize 掉，冗余用户名即可展示
          connectorName: user.username,
          position: count + 1,
          pairKey,
        },
        populate: {
          block: { fields: ['documentId', 'excerpt', 'blockType', 'coverImageUrl'] },
          channel: { fields: ['documentId', 'title', 'slug'] },
          connector: { fields: ['id', 'username'] },
        },
      });

      // 5. 计数器缓存：热门度排序无需 COUNT 全表；
      //    channel 计数顺带 touch updatedAt —— 探索页"最近活跃"排序的免费信号
      await strapi.documents('api::block.block').update({
        documentId: blockId,
        data: { connectionCount: (block.connectionCount ?? 0) + 1 },
      });
      await strapi.documents('api::channel.channel').update({
        documentId: channelId,
        data: { connectionCount: (channel.connectionCount ?? 0) + 1 },
      });

      // 6. 通知：Block 作者「你的 Block 被连结」；频道主「有人向你的频道添加内容」（避免重复）
      await notify(strapi, {
        recipientName: (block as any).creatorName,
        actorName: user.username,
        type: 'connect_block',
        targetBlockId: blockId,
        targetChannelSlug: (channel as any).slug,
        targetChannelTitle: (channel as any).title,
      });
      if ((channel as any).ownerName !== (block as any).creatorName) {
        await notify(strapi, {
          recipientName: (channel as any).ownerName,
          actorName: user.username,
          type: 'connect_to_channel',
          targetBlockId: blockId,
          targetChannelSlug: (channel as any).slug,
          targetChannelTitle: (channel as any).title,
        });
      }

      ctx.status = 201;
      return { data: created };
    } catch (err: any) {
      // 并发双击时唯一索引可能先于 findFirst 检查命中
      if (String(err?.message).includes('unique') || err?.code === '23505') {
        return ctx.conflict('该 Block 已连结到此 Channel。');
      }
      throw err;
    }
  },

  /**
   * POST /connections/connect-channel { contentChannelId, targetChannelId }
   * 把一个频道作为"块"连入另一个频道（Are.na 的频道套频道）。
   * 鉴权：对目标频道有连结权（public 任何登录 / closed·private 属主或协作者），
   *      且对被连入的频道有可见权（不能连一个你看不到的私密频道）。禁止自连。
   */
  async connectChannel(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('登录后才能连结频道。');

    const { contentChannelId, targetChannelId } = ctx.request.body ?? {};
    if (typeof contentChannelId !== 'string' || typeof targetChannelId !== 'string') {
      return ctx.badRequest('contentChannelId 与 targetChannelId 均为必填。');
    }
    if (contentChannelId === targetChannelId) {
      return ctx.badRequest('频道不能连结到自身。');
    }

    const target = await strapi.documents('api::channel.channel').findOne({
      documentId: targetChannelId,
      fields: ['connectionCount', 'visibility', 'ownerName', 'title', 'slug'],
      populate: { owner: { fields: ['id'] }, collaborators: { fields: ['id'] } },
    });
    if (!target) return ctx.notFound('目标频道不存在。');
    const isOwner = target.owner?.id === user.id;
    const isCollaborator = (target.collaborators ?? []).some((c: any) => c.id === user.id);
    if (!(target.visibility === 'public' || isOwner || isCollaborator)) {
      return ctx.forbidden('无权向目标频道连结内容。');
    }

    const content = await strapi.documents('api::channel.channel').findOne({
      documentId: contentChannelId,
      fields: ['visibility', 'ownerName', 'collaboratorNames'],
    });
    if (!content) return ctx.notFound('要连结的频道不存在。');
    if (!canViewPrivateChannel(content as any, user.username)) {
      return ctx.forbidden('无权连结该私密频道。');
    }

    const pairKey = `chan:${contentChannelId}:${targetChannelId}`;
    const existing = await strapi.documents('api::connection.connection').findFirst({
      filters: { pairKey },
    });
    if (existing) {
      ctx.status = 200;
      return { data: existing, meta: { duplicated: true } };
    }

    const count = await strapi.documents('api::connection.connection').count({
      filters: { channel: { documentId: targetChannelId } },
    });

    try {
      const created = await strapi.documents('api::connection.connection').create({
        data: {
          contentChannel: contentChannelId,
          channel: targetChannelId,
          connector: user.id,
          connectorName: user.username,
          position: count + 1,
          pairKey,
        },
        populate: {
          contentChannel: { fields: ['documentId', 'title', 'slug', 'connectionCount'] },
          channel: { fields: ['documentId', 'title', 'slug'] },
          connector: { fields: ['id', 'username'] },
        },
      });
      await strapi.documents('api::channel.channel').update({
        documentId: targetChannelId,
        data: { connectionCount: (target.connectionCount ?? 0) + 1 },
      });

      await notify(strapi, {
        recipientName: (target as any).ownerName,
        actorName: user.username,
        type: 'connect_channel_to_channel',
        targetChannelSlug: (target as any).slug,
        targetChannelTitle: (target as any).title,
      });

      ctx.status = 201;
      return { data: created };
    } catch (err: any) {
      if (String(err?.message).includes('unique') || err?.code === '23505') {
        return ctx.conflict('该频道已连结到目标频道。');
      }
      throw err;
    }
  },

  /**
   * DELETE /api/connections/disconnect
   * body: { connectionId: string (documentId) }
   * 只解除边，Block 本体永远不动。
   */
  async disconnect(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const { connectionId } = ctx.request.body ?? {};
    if (typeof connectionId !== 'string') {
      return ctx.badRequest('connectionId（documentId）为必填。');
    }

    const connection = await strapi.documents('api::connection.connection').findOne({
      documentId: connectionId,
      populate: {
        connector: { fields: ['id'] },
        channel: {
          fields: ['documentId', 'connectionCount'],
          populate: { owner: { fields: ['id'] } },
        },
        block: { fields: ['documentId', 'connectionCount'] },
      },
    });
    if (!connection) return ctx.notFound('Connection 不存在。');

    const isConnector = connection.connector?.id === user.id;
    const isChannelOwner = connection.channel?.owner?.id === user.id;
    if (!isConnector && !isChannelOwner) {
      return ctx.forbidden('只有连结者本人或 Channel 主人可以解除连结。');
    }

    await strapi.documents('api::connection.connection').delete({ documentId: connectionId });

    if (connection.block) {
      await strapi.documents('api::block.block').update({
        documentId: connection.block.documentId,
        data: { connectionCount: Math.max(0, (connection.block.connectionCount ?? 1) - 1) },
      });
    }
    if (connection.channel) {
      await strapi.documents('api::channel.channel').update({
        documentId: connection.channel.documentId,
        data: { connectionCount: Math.max(0, (connection.channel.connectionCount ?? 1) - 1) },
      });
    }

    ctx.status = 200;
    return { data: { documentId: connectionId, removed: true } };
  },
}));
