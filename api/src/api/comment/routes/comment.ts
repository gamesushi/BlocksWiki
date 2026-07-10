import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::comment.comment', {
  config: {
    // create/delete 走自定义 controller 覆盖（作者归属校验），核心路由只留 find/findOne
    update: { policies: ['admin::isAuthenticatedAdmin'] },
  },
});
