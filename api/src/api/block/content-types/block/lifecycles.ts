/**
 * Block lifecycles
 * 写入时把 Editor.js JSON 反规范化成 excerpt / coverImageUrl / searchText 平面字段。
 * 目的：网格渲染零 JSON 解析（盲点审计 #2），全文搜索走 $containsi 无需外部引擎。
 */
import { deriveBlockFields } from '../../../../utils/derive-block-fields';

export default {
  beforeCreate(event: any) {
    const { data } = event.params;
    if (data?.content) {
      Object.assign(data, deriveBlockFields(data.content));
    }
  },
  beforeUpdate(event: any) {
    const { data } = event.params;
    if (data?.content) {
      Object.assign(data, deriveBlockFields(data.content));
    }
  },
  /**
   * Block 删除后清理悬挂的 Connection 边（Strapi 只清 link 表，不删 Connection 行，
   * 会留下 block 为 null 的“幽灵边”——见盲点审计 #3）。
   */
  async afterDelete(event: any) {
    const strapi = (global as any).strapi;
    // 只清「内容两侧都空」的幽灵边：block 与 contentChannel 皆 null。
    // 频道块的边 block 为 null 但 contentChannel 有值，是合法边，不能误删。
    const orphans = await strapi.db.query('api::connection.connection').findMany({
      where: { $and: [{ block: null }, { contentChannel: null }] },
      select: ['id'],
    });
    if (orphans.length > 0) {
      await strapi.db.query('api::connection.connection').deleteMany({
        where: { id: { $in: orphans.map((o: any) => o.id) } },
      });
    }
  },
};
