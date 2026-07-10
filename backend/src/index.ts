import type { Core } from '@strapi/strapi';
import { deriveBlockFields } from './utils/derive-block-fields';

/**
 * 启动时幂等种子化 users-permissions 角色权限，免去在管理后台手动勾选。
 * Public：只读浏览；Authenticated：发布 Block、建 Channel、connect/disconnect、上传图片。
 * 注意：connection 的核心 create/update/delete 故意不授予任何角色。
 */
const READ_ACTIONS = [
  'api::block.block.find',
  'api::block.block.findOne',
  'api::channel.channel.find',
  'api::channel.channel.findOne',
  'api::connection.connection.find',
  'api::connection.connection.findOne',
  'api::comment.comment.find',
  'api::comment.comment.findOne',
  'api::wiki-page.wiki-page.find',
  'api::wiki-page.wiki-page.findOne',
  'api::wiki-page.wiki-page.tree',
  // 公开档案：用户名 + followerCount 等非私密字段（password 等 schema 标记 private，不返回）
  'plugin::users-permissions.user.find',
];

const GRANTS: Record<string, string[]> = {
  public: READ_ACTIONS,
  authenticated: [
    ...READ_ACTIONS,
    'api::block.block.create',
    'api::block.block.update',
    'api::block.block.updateDescription',
    'api::block.block.delete',
    'api::comment.comment.create',
    'api::comment.comment.delete',
    'api::channel.channel.create',
    'api::channel.channel.update',
    'api::channel.channel.delete',
    'api::channel.channel.manageCollaborator',
    'api::connection.connection.connect',
    'api::connection.connection.connectChannel',
    'api::connection.connection.disconnect',
    'api::follow.follow.followUser',
    'api::follow.follow.followChannel',
    'api::notification.notification.find',
    'api::notification.notification.unreadCount',
    'api::notification.notification.markRead',
    // wiki 写操作对所有登录用户开放路由，controller 内再校验 isAdmin
    'api::wiki-page.wiki-page.create',
    'api::wiki-page.wiki-page.update',
    'api::wiki-page.wiki-page.delete',
    'plugin::upload.content-api.upload',
  ],
};

/** 管理员用户名（逗号分隔）；bootstrap 时提升为 isAdmin。演示实例默认 midori。 */
const ADMIN_USERNAMES = (process.env.LIFEWIKI_ADMINS ?? 'midori')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * 图查询关键索引。放在 bootstrap 而非 database/migrations 的原因（实测踩坑）：
 * Strapi 在首次启动时先执行 migrations、后同步 content-type 表结构，
 * 迁移里的 hasTable() 全部 false、静默跳过，且迁移被记录为已执行不再重跑。
 * bootstrap 在 schema 同步之后运行，配合 IF NOT EXISTS 天然幂等。
 * 注：*_lnk 关系表的 fk/uq 索引由 Strapi v5 自动创建，无需重复建。
 */
const INDEX_STATEMENTS = [
  // pairKey 唯一索引 = 并发重复 connect 的数据库级兜底（schema 的 unique: true 对后加列不生效）
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_conn_pair_key ON connections (pair_key)',
  // Channel 页排序热路径
  'CREATE INDEX IF NOT EXISTS idx_conn_position ON connections (position)',
  'CREATE INDEX IF NOT EXISTS idx_conn_created_at ON connections (created_at)',
  // 热门 Block 排序
  'CREATE INDEX IF NOT EXISTS idx_block_conn_count ON blocks (connection_count)',
  // 探索页：公开频道按活跃度/规模排序
  'CREATE INDEX IF NOT EXISTS idx_channel_conn_count ON channels (connection_count)',
  // Block 详情页评论列表
  'CREATE INDEX IF NOT EXISTS idx_comment_block ON comments_block_lnk (block_id)',
];

/**
 * 计数缓存幂等回填：以 *_lnk 关系表为准重算 connectionCount。
 * 每次启动执行 —— 同时修复幽灵边清理等场景造成的计数漂移（全表一条 SQL，毫秒级）。
 */
const COUNTER_BACKFILL = [
  `UPDATE blocks SET connection_count =
     (SELECT COUNT(*) FROM connections_block_lnk l WHERE l.block_id = blocks.id)`,
  `UPDATE channels SET connection_count =
     (SELECT COUNT(*) FROM connections_channel_lnk l WHERE l.channel_id = channels.id)`,
  `UPDATE blocks SET comment_count =
     (SELECT COUNT(*) FROM comments_block_lnk l WHERE l.block_id = blocks.id)`,
];

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    for (const sql of [...INDEX_STATEMENTS, ...COUNTER_BACKFILL]) {
      try {
        await strapi.db.connection.raw(sql);
      } catch (err: any) {
        strapi.log.warn(`[bootstrap] statement skipped: ${sql.slice(0, 60)}… — ${err?.message}`);
      }
    }

    // searchText 回填：需要解析 Editor.js JSON，纯 SQL 做不到，走 document API。
    // 只补 searchText 为空的历史 Block（幂等），已有的不动。
    try {
      const stale = await strapi.documents('api::block.block').findMany({
        filters: { searchText: { $null: true } },
        fields: ['documentId', 'content'],
        limit: -1,
      });
      for (const b of stale as any[]) {
        const { searchText, excerpt, coverImageUrl } = deriveBlockFields(b.content ?? {});
        await strapi.documents('api::block.block').update({
          documentId: b.documentId,
          data: { searchText, excerpt, coverImageUrl },
        });
      }
      if (stale.length > 0) {
        strapi.log.info(`[bootstrap] searchText 回填 ${stale.length} 个 Block`);
      }
    } catch (err: any) {
      strapi.log.warn(`[bootstrap] searchText 回填跳过 — ${err?.message}`);
    }

    // 提升管理员（幂等）
    for (const username of ADMIN_USERNAMES) {
      const u = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({ where: { username } });
      if (u && !u.isAdmin) {
        await strapi.db
          .query('plugin::users-permissions.user')
          .update({ where: { id: u.id }, data: { isAdmin: true } });
        strapi.log.info(`[bootstrap] promoted admin: ${username}`);
      }
    }

    for (const [roleType, actions] of Object.entries(GRANTS)) {
      const role = await strapi.db
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: roleType } });
      if (!role) continue;

      for (const action of actions) {
        const existing = await strapi.db
          .query('plugin::users-permissions.permission')
          .findOne({ where: { action, role: role.id } });
        if (!existing) {
          await strapi.db
            .query('plugin::users-permissions.permission')
            .create({ data: { action, role: role.id } });
          strapi.log.info(`[bootstrap] granted ${action} -> ${roleType}`);
        }
      }
    }
  },
};
