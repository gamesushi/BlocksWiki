/**
 * 自定义路由先于核心 /blocks/:id 注册，避免 :id 吞掉 /description 后缀。
 */
export default {
  routes: [
    {
      method: 'PUT',
      path: '/blocks/:id/description',
      handler: 'block.updateDescription',
      config: { policies: [] },
    },
  ],
};
