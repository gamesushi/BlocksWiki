/**
 * 自定义路由先于核心 /wiki-pages/:id 注册。
 * /wiki-pages/tree 返回导航树（published 页；管理员含草稿）。
 */
export default {
  routes: [
    {
      method: 'GET',
      path: '/wiki-pages/tree',
      handler: 'wiki-page.tree',
      config: { policies: [] },
    },
  ],
};
