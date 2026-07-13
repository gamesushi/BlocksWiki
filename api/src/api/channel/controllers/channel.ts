/**
 * Channel controller — 覆盖 create：owner 由服务端从 JWT 注入，不信任前端传入。
 */
import { factories } from '@strapi/strapi';
import { canViewPrivateChannel } from '../../connection/controllers/connection';
import { notify } from '../../../utils/notify';

/**
 * uid 字段的自动生成只发生在管理后台；content API 创建必须显式给 slug。
 * 规则：title 的 ascii 部分 + 随机后缀（纯中文标题退化为 channel-xxxxxx）。
 */
function toSlug(title: string): string {
  const ascii = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const suffix = Math.random().toString(36).slice(2, 8);
  return ascii ? `${ascii}-${suffix}` : `channel-${suffix}`;
}

/** 强制查询结果携带私密过滤所需字段，不被客户端 fields 参数绕过 */
function ensureVisibilityFields(fields: unknown) {
  if (Array.isArray(fields)) {
    for (const f of ['visibility', 'ownerName', 'collaboratorNames']) {
      if (!fields.includes(f)) fields.push(f);
    }
  }
}

export default factories.createCoreController('api::channel.channel', ({ strapi }) => ({
  /** private 频道仅属主+协作者可见（列表） */
  async find(ctx) {
    ensureVisibilityFields(ctx.query?.fields);
    const response = await super.find(ctx);
    const username = ctx.state.user?.username;
    if (Array.isArray(response?.data)) {
      response.data = response.data.filter((ch: any) => canViewPrivateChannel(ch, username));
    }
    return response;
  },

  /** private 频道对无权者返回 404（不暴露存在性） */
  async findOne(ctx) {
    ensureVisibilityFields(ctx.query?.fields);
    const response = await super.findOne(ctx);
    const ch = response?.data;
    if (ch && !canViewPrivateChannel(ch, ctx.state.user?.username)) {
      return ctx.notFound();
    }
    return response;
  },

  /**
   * POST /channels/collaborators { channelId, username, action: 'add' | 'remove' }
   * 仅属主可管理。同步维护 collaborators 关系 + collaboratorNames 反规范化数组。
   */
  async manageCollaborator(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const { channelId, username, action } = ctx.request.body ?? {};
    if (typeof channelId !== 'string' || typeof username !== 'string') {
      return ctx.badRequest('channelId 与 username 必填。');
    }
    if (action !== 'add' && action !== 'remove') {
      return ctx.badRequest('action 须为 add 或 remove。');
    }

    const channel = await strapi.documents('api::channel.channel').findOne({
      documentId: channelId,
      fields: ['collaboratorNames', 'title', 'slug'],
      populate: { owner: { fields: ['id'] }, collaborators: { fields: ['id', 'username'] } },
    });
    if (!channel) return ctx.notFound('Channel 不存在。');
    if (channel.owner?.id !== user.id) {
      return ctx.forbidden('只有属主可以管理协作者。');
    }

    const target = await strapi
      .query('plugin::users-permissions.user')
      .findOne({ where: { username } });
    if (!target) return ctx.badRequest('该用户不存在。');
    if (target.id === user.id) return ctx.badRequest('属主无需添加为协作者。');

    const currentIds = (channel.collaborators ?? []).map((c: any) => c.id);
    let nextIds: number[];
    if (action === 'add') {
      if (currentIds.includes(target.id)) {
        return { data: { username, action, changed: false } }; // 幂等
      }
      nextIds = [...currentIds, target.id];
    } else {
      if (!currentIds.includes(target.id)) {
        return { data: { username, action, changed: false } };
      }
      nextIds = currentIds.filter((id: number) => id !== target.id);
    }

    const nextNames = Array.from(
      new Set(
        (
          await strapi
            .query('plugin::users-permissions.user')
            .findMany({ where: { id: { $in: nextIds } }, select: ['username'] })
        ).map((u: any) => u.username)
      )
    );

    await strapi.documents('api::channel.channel').update({
      documentId: channelId,
      data: { collaborators: nextIds, collaboratorNames: nextNames },
    });

    if (action === 'add') {
      await notify(strapi, {
        recipientName: username,
        actorName: user.username,
        type: 'add_collaborator',
        targetChannelSlug: (channel as any).slug,
        targetChannelTitle: (channel as any).title,
      });
    }

    return { data: { username, action, changed: true, collaboratorNames: nextNames } };
  },

  /** 删除频道：仅属主；先逐边递减 block 计数并删边，再删频道本体 */
  async delete(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const documentId = ctx.params.id;
    const channel = await strapi.documents('api::channel.channel').findOne({
      documentId,
      populate: { owner: { fields: ['id'] } },
    });
    if (!channel) return ctx.notFound();
    if (channel.owner?.id !== user.id) {
      return ctx.forbidden('只能删除自己的 Channel。');
    }

    // 1) 频道作为容器：删除其内所有边，递减各 block 计数
    const connections = await strapi.documents('api::connection.connection').findMany({
      filters: { channel: { documentId } },
      populate: { block: { fields: ['documentId', 'connectionCount'] } },
      limit: -1,
    });
    for (const conn of connections) {
      if (conn.block) {
        await strapi.documents('api::block.block').update({
          documentId: conn.block.documentId,
          data: { connectionCount: Math.max(0, (conn.block.connectionCount ?? 1) - 1) },
        });
      }
      await strapi.documents('api::connection.connection').delete({ documentId: conn.documentId });
    }

    // 2) 频道作为"频道块"：删除它出现在别处的边，递减那些容器频道计数
    const appearances = await strapi.documents('api::connection.connection').findMany({
      filters: { contentChannel: { documentId } },
      populate: { channel: { fields: ['documentId', 'connectionCount'] } },
      limit: -1,
    });
    for (const conn of appearances) {
      if (conn.channel) {
        await strapi.documents('api::channel.channel').update({
          documentId: conn.channel.documentId,
          data: { connectionCount: Math.max(0, (conn.channel.connectionCount ?? 1) - 1) },
        });
      }
      await strapi.documents('api::connection.connection').delete({ documentId: conn.documentId });
    }

    await strapi.documents('api::channel.channel').delete({ documentId });
    return {
      data: {
        documentId,
        deleted: true,
        removedConnections: connections.length,
        removedAppearances: appearances.length,
      },
    };
  },

  /**
   * PUT /channels/:id —— 编辑频道元信息（title/description/visibility）。
   * 仅属主可改；slug 保持不变以避免破坏已有连结与分享链接。
   * RBAC 的 channel.update 已对 Authenticated 角色开放，此处额外做属主校验。
   */
  async update(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('登录后才能编辑 Channel。');

    const documentId = ctx.params.id;
    const channel = await strapi.documents('api::channel.channel').findOne({
      documentId,
      populate: { owner: { fields: ['id'] } },
    });
    if (!channel) return ctx.notFound('Channel 不存在。');
    if (channel.owner?.id !== user.id) {
      return ctx.forbidden('只能编辑自己的 Channel。');
    }

    const { title, description, visibility } = ctx.request.body?.data ?? {};
    const data: Record<string, unknown> = {};
    if (typeof title === 'string' && title.trim()) data.title = title.trim();
    if (typeof description === 'string') data.description = description;
    if (['public', 'closed', 'private'].includes(visibility)) data.visibility = visibility;

    if (Object.keys(data).length === 0) {
      return ctx.badRequest('没有可更新的字段。');
    }

    const updated = await strapi.documents('api::channel.channel').update({
      documentId,
      data,
      populate: { owner: { fields: ['id', 'username'] } },
    });
    return { data: updated };
  },

  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('登录后才能创建 Channel。');

    const { title, description, visibility, slug } = ctx.request.body?.data ?? {};
    if (typeof title !== 'string' || !title.trim()) {
      return ctx.badRequest('title 为必填。');
    }

    const created = await strapi.documents('api::channel.channel').create({
      data: {
        title: title.trim(),
        description: typeof description === 'string' ? description : '',
        visibility: ['public', 'closed', 'private'].includes(visibility) ? visibility : 'public',
        slug: typeof slug === 'string' && slug ? slug : toSlug(title),
        owner: user.id,
        // 反规范化：匿名访客读 Channel 页时 user 关系会被 sanitize 掉
        ownerName: user.username,
      },
      populate: { owner: { fields: ['id', 'username'] } },
    });

    ctx.status = 201;
    return { data: created };
  },
}));
