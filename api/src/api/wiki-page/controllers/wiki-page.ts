/**
 * WikiPage controller.
 * 写操作（create/update/delete）仅管理员（ctx.state.user.isAdmin）。
 * 读：public 只见 published；管理员见全部（含草稿）。
 * items 是有序 JSON 数组：[{type:'text',content}|{type:'block',blockId,note?}|{type:'channel',channelId,note?}]
 */
import { factories } from '@strapi/strapi';

type WikiItem =
  | { type: 'text'; content: unknown }
  | { type: 'block'; blockId: string; note?: string }
  | { type: 'channel'; channelId: string; note?: string };

function isValidItems(items: unknown): items is WikiItem[] {
  if (!Array.isArray(items)) return false;
  return items.every((it: any) => {
    if (!it || typeof it !== 'object') return false;
    if (it.type === 'text') return it.content && typeof it.content === 'object';
    if (it.type === 'block') return typeof it.blockId === 'string';
    if (it.type === 'channel') return typeof it.channelId === 'string';
    return false;
  });
}

function isAdmin(ctx: any): boolean {
  return !!ctx.state.user?.isAdmin;
}

function toSlug(title: string): string {
  const ascii = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const suffix = Math.random().toString(36).slice(2, 8);
  return ascii ? `${ascii}-${suffix}` : `wiki-${suffix}`;
}

export default factories.createCoreController('api::wiki-page.wiki-page', ({ strapi }) => ({
  /** GET /wiki-pages/tree —— 导航树扁平数组（前端组装层级） */
  async tree(ctx) {
    const admin = isAdmin(ctx);
    const pages = await strapi.documents('api::wiki-page.wiki-page').findMany({
      ...(admin ? {} : { filters: { published: true } }),
      fields: ['title', 'slug', 'order', 'published'],
      populate: { parent: { fields: ['documentId'] } },
      sort: ['order:asc', 'title:asc'],
      limit: -1,
    });
    return {
      data: pages.map((p: any) => ({
        documentId: p.documentId,
        title: p.title,
        slug: p.slug,
        order: p.order,
        published: p.published,
        parentId: p.parent?.documentId ?? null,
      })),
    };
  },

  async find(ctx) {
    if (!isAdmin(ctx)) {
      // 强制只返回 published，客户端 filters 无法放开
      ctx.query = { ...ctx.query, filters: { ...(ctx.query?.filters as object), published: true } };
    }
    return super.find(ctx);
  },

  async findOne(ctx) {
    const response = await super.findOne(ctx);
    if (response?.data && !response.data.published && !isAdmin(ctx)) {
      return ctx.notFound();
    }
    return response;
  },

  async create(ctx) {
    if (!isAdmin(ctx)) return ctx.forbidden('仅管理员可编排 Wiki。');
    const { title, slug, order, intro, items, published, parent } = ctx.request.body?.data ?? {};
    if (typeof title !== 'string' || !title.trim()) return ctx.badRequest('title 必填。');
    if (items !== undefined && !isValidItems(items)) return ctx.badRequest('items 结构非法。');

    const created = await strapi.documents('api::wiki-page.wiki-page').create({
      data: {
        title: title.trim(),
        slug: typeof slug === 'string' && slug ? slug : toSlug(title),
        order: typeof order === 'number' ? order : 0,
        intro: intro ?? null,
        items: Array.isArray(items) ? items : [],
        published: !!published,
        curatorName: ctx.state.user.username,
        ...(typeof parent === 'string' && parent ? { parent } : {}),
      },
      populate: { parent: { fields: ['documentId', 'title', 'slug'] } },
    });
    ctx.status = 201;
    return { data: created };
  },

  async update(ctx) {
    if (!isAdmin(ctx)) return ctx.forbidden('仅管理员可编排 Wiki。');
    const documentId = ctx.params.id;
    const { title, slug, order, intro, items, published, parent } = ctx.request.body?.data ?? {};
    if (items !== undefined && !isValidItems(items)) return ctx.badRequest('items 结构非法。');
    if (typeof parent === 'string' && parent === documentId) {
      return ctx.badRequest('页面不能作为自己的父级。');
    }

    const data: Record<string, unknown> = {};
    if (typeof title === 'string' && title.trim()) data.title = title.trim();
    if (typeof slug === 'string' && slug) data.slug = slug;
    if (typeof order === 'number') data.order = order;
    if (intro !== undefined) data.intro = intro;
    if (items !== undefined) data.items = items;
    if (published !== undefined) data.published = !!published;
    if (parent !== undefined) data.parent = parent || null;

    const updated = await strapi.documents('api::wiki-page.wiki-page').update({
      documentId,
      data,
      populate: { parent: { fields: ['documentId', 'title', 'slug'] } },
    });
    if (!updated) return ctx.notFound();
    return { data: updated };
  },

  async delete(ctx) {
    if (!isAdmin(ctx)) return ctx.forbidden('仅管理员可编排 Wiki。');
    const documentId = ctx.params.id;
    const page = await strapi.documents('api::wiki-page.wiki-page').findOne({
      documentId,
      populate: { parent: { fields: ['documentId'] }, children: { fields: ['documentId'] } },
    });
    if (!page) return ctx.notFound();

    // 子页面上提到被删页的父级（避免孤立子树），再删本页
    const parentId = (page as any).parent?.documentId ?? null;
    for (const child of (page as any).children ?? []) {
      await strapi.documents('api::wiki-page.wiki-page').update({
        documentId: child.documentId,
        data: { parent: parentId },
      });
    }
    await strapi.documents('api::wiki-page.wiki-page').delete({ documentId });
    return { data: { documentId, deleted: true, reparentedChildren: (page as any).children?.length ?? 0 } };
  },
}));
