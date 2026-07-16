/**
 * Block lifecycles
 * 写入时把 Editor.js JSON 反规范化成 excerpt / coverImageUrl / searchText 平面字段。
 * 目的：网格渲染零 JSON 解析（盲点审计 #2），全文搜索走 $containsi 无需外部引擎。
 *
 * 另：block→block 内链协调（reconcileBlockLinks）也在此挂接 —— 任何写入都触发，
 * 保证正文里的 /block/<id> 超链接与 Connection 边、反链计数始终一致（避免手搓 HTML 的同步漂移）。
 */
import { deriveBlockFields } from '../../../../utils/derive-block-fields';
import { reconcileBlockLinks, cleanupBlockConnections } from '../../../../utils/reconcile-block-links';

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
   * 新建后协调 block→block 内链：扫描正文 /block/<id>，upsert targetBlock 边 + 反链计数。
   */
  async afterCreate(event: any) {
    const strapi = (global as any).strapi;
    const block = event.result;
    if (block?.documentId && block.content) {
      await reconcileBlockLinks(strapi, { documentId: block.documentId, content: block.content });
    }
  },
  /**
   * 仅当正文变更时才重新协调内链（计数类自更新不含 content，靠此守卫避免级联触发）。
   */
  async afterUpdate(event: any) {
    const strapi = (global as any).strapi;
    const data = event.params?.data;
    if (data && 'content' in data && event.result?.documentId) {
      await reconcileBlockLinks(strapi, { documentId: event.result.documentId, content: data.content });
    }
  },
  /**
   * Block 删除后清理悬挂的 Connection 边（Strapi 只清 link 表，不删 Connection 行，
   * 会留下 block 为 null 的“幽灵边”——见盲点审计 #3）。
   */
  async afterDelete(event: any) {
    const strapi = (global as any).strapi;
    const deletedId = event.result?.documentId;
    if (deletedId) {
      // 清理以本 block 为源或目标的边（含 block→block 与 block→channel），并回收反链计数
      await cleanupBlockConnections(strapi, deletedId);
    }
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
