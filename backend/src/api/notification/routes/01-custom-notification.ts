export default {
  routes: [
    {
      method: 'GET',
      path: '/notifications/unread-count',
      handler: 'notification.unreadCount',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/notifications/mark-read',
      handler: 'notification.markRead',
      config: { policies: [] },
    },
  ],
};
