import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS')!,
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
  cron: {
    enabled: true,
    tasks: {
      /**
       * 图卫生日巡（盲点审计 #3 的落地）：
       * 1. 清幽灵边 —— 容器频道已删（channel null）或内容两侧都没了（block 与 contentChannel 皆 null）。
       *    注意：频道块的边 block 为 null 但 contentChannel 有值，属于合法边，不可误删。
       * 2. 盘点无主 Block（connectionCount=0 且 90 天未动），先记日志观察量级，
       *    归档动作等有真实数据后再决定（生活记录找回诉求 > 省磁盘）。
       */
      graphHygiene: {
        options: { rule: '0 4 * * *' },
        async task({ strapi }: { strapi: Core.Strapi }) {
          const ghosts = await strapi.db.query('api::connection.connection').findMany({
            where: { $or: [{ channel: null }, { $and: [{ block: null }, { contentChannel: null }] }] },
            select: ['id'],
          });
          if (ghosts.length > 0) {
            await strapi.db.query('api::connection.connection').deleteMany({
              where: { id: { $in: ghosts.map((g: any) => g.id) } },
            });
          }

          const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          const orphanCount = await strapi.db.query('api::block.block').count({
            where: { connectionCount: 0, updatedAt: { $lt: cutoff } },
          });

          strapi.log.info(
            `[graphHygiene] 清除幽灵边 ${ghosts.length} 条；90 天无连结的孤儿 Block ${orphanCount} 个`
          );
        },
      },
    },
  },
});

export default config;
