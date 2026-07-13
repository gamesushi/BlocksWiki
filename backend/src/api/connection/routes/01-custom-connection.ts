/**
 * 自定义路由文件名以 01- 开头，保证在核心路由之前注册，
 * 避免 /connections/connect 被 /connections/:id 吞掉。
 */
export default {
  routes: [
    {
      method: 'POST',
      path: '/connections/connect',
      handler: 'connection.connect',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/connections/connect-channel',
      handler: 'connection.connectChannel',
      config: { policies: [] },
    },
    {
      // POST 而非 DELETE：Strapi 的 koa-body 默认不解析 DELETE 请求体，
      // connectionId 会永远丢失（实测踩坑）；与 connect 保持对称
      method: 'POST',
      path: '/connections/disconnect',
      handler: 'connection.disconnect',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/connections/reorder',
      handler: 'connection.reorder',
      config: { policies: [] },
    },
  ],
};
