import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::notification.notification', {
  config: {
    // 写操作全关：通知只由服务端在动作发生时生成
    create: { policies: ['admin::isAuthenticatedAdmin'] },
    update: { policies: ['admin::isAuthenticatedAdmin'] },
    delete: { policies: ['admin::isAuthenticatedAdmin'] },
  },
});
