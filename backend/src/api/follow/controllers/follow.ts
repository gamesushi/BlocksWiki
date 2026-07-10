/**
 * Follow controller（无 content-type 的纯自定义 API）。
 * 关注用户 / 关注频道，维护 M2M 关系 + followingNames 反规范化 + followerCount 计数。
 * user→user 关系在 API 响应里会被 sanitize，故 followingNames/followerCount 是前端判断"是否已关注"和展示计数的可靠来源。
 */
import { canViewPrivateChannel } from '../../connection/controllers/connection';
import { notify } from '../../../utils/notify';

export default {
  async followUser(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();
    const { username, action } = ctx.request.body ?? {};
    if (typeof username !== 'string' || (action !== 'follow' && action !== 'unfollow')) {
      return ctx.badRequest('username 与 action（follow|unfollow）必填。');
    }
    if (username === user.username) return ctx.badRequest('不能关注自己。');

    const target = await strapi
      .query('plugin::users-permissions.user')
      .findOne({ where: { username }, populate: { followers: { select: ['id'] } } });
    if (!target) return ctx.badRequest('该用户不存在。');

    const me = await strapi
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: user.id }, populate: { following: { select: ['id', 'username'] } } });
    const currentIds: number[] = (me.following ?? []).map((u: any) => u.id);
    const already = currentIds.includes(target.id);

    let nextIds: number[];
    if (action === 'follow') {
      if (already) return { data: { username, following: true, changed: false } };
      nextIds = [...currentIds, target.id];
    } else {
      if (!already) return { data: { username, following: false, changed: false } };
      nextIds = currentIds.filter((id) => id !== target.id);
    }

    const nextUsers = await strapi
      .query('plugin::users-permissions.user')
      .findMany({ where: { id: { $in: nextIds.length ? nextIds : [-1] } }, select: ['username'] });
    const followingNames = nextUsers.map((u: any) => u.username);

    await strapi
      .query('plugin::users-permissions.user')
      .update({ where: { id: user.id }, data: { following: nextIds, followingNames } });

    const delta = action === 'follow' ? 1 : -1;
    await strapi.query('plugin::users-permissions.user').update({
      where: { id: target.id },
      data: { followerCount: Math.max(0, (target.followerCount ?? 0) + delta) },
    });

    if (action === 'follow') {
      await notify(strapi, { recipientName: username, actorName: user.username, type: 'follow_user' });
    }

    return { data: { username, following: action === 'follow', changed: true, followingNames } };
  },

  async followChannel(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();
    const { channelId, action } = ctx.request.body ?? {};
    if (typeof channelId !== 'string' || (action !== 'follow' && action !== 'unfollow')) {
      return ctx.badRequest('channelId 与 action（follow|unfollow）必填。');
    }

    const channel = await strapi.documents('api::channel.channel').findOne({
      documentId: channelId,
      fields: ['id', 'visibility', 'ownerName', 'collaboratorNames', 'followerCount', 'title', 'slug'],
    });
    if (!channel) return ctx.notFound('频道不存在。');
    if (!canViewPrivateChannel(channel as any, user.username)) {
      return ctx.forbidden('无权关注该私密频道。');
    }

    const me = await strapi.query('plugin::users-permissions.user').findOne({
      where: { id: user.id },
      populate: { followedChannels: { select: ['id'] } },
    });
    const currentIds: number[] = (me.followedChannels ?? []).map((c: any) => c.id);
    const already = currentIds.includes((channel as any).id);

    let nextIds: number[];
    if (action === 'follow') {
      if (already) return { data: { channelId, following: true, changed: false } };
      nextIds = [...currentIds, (channel as any).id];
    } else {
      if (!already) return { data: { channelId, following: false, changed: false } };
      nextIds = currentIds.filter((id) => id !== (channel as any).id);
    }

    await strapi
      .query('plugin::users-permissions.user')
      .update({ where: { id: user.id }, data: { followedChannels: nextIds } });

    const delta = action === 'follow' ? 1 : -1;
    await strapi.documents('api::channel.channel').update({
      documentId: channelId,
      data: { followerCount: Math.max(0, ((channel as any).followerCount ?? 0) + delta) },
    });

    if (action === 'follow') {
      await notify(strapi, {
        recipientName: (channel as any).ownerName,
        actorName: user.username,
        type: 'follow_channel',
        targetChannelSlug: (channel as any).slug,
        targetChannelTitle: (channel as any).title,
      });
    }

    return { data: { channelId, following: action === 'follow', changed: true } };
  },
};
