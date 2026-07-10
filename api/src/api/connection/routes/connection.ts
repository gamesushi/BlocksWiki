import { factories } from '@strapi/strapi';

/**
 * 核心读路由照常注册；create/update/delete 不给任何角色授权（见 src/index.ts bootstrap），
 * 写操作只能走自定义的 connect / disconnect。
 */
export default factories.createCoreRouter('api::connection.connection');
