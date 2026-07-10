/**
 * 自定义路由先于核心路由注册，避免 /channels/collaborators 被 /channels/:id 吞掉。
 * 用 POST（含 add/remove action）—— Strapi 不解析 DELETE 请求体。
 */
export default {
  routes: [
    {
      method: 'POST',
      path: '/channels/collaborators',
      handler: 'channel.manageCollaborator',
      config: { policies: [] },
    },
  ],
};
