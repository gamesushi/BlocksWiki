export default {
  routes: [
    {
      method: 'POST',
      path: '/follow/user',
      handler: 'follow.followUser',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/follow/channel',
      handler: 'follow.followChannel',
      config: { policies: [] },
    },
  ],
};
