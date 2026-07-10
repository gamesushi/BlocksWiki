'use server';

import { strapiFetch, type StrapiResponse } from '@/lib/strapi';
import type { AppNotification } from '@/lib/notification-types';

export async function getNotifications(): Promise<AppNotification[]> {
  try {
    const res = await strapiFetch<StrapiResponse<AppNotification[]>>(
      '/notifications?pagination[pageSize]=50',
      { revalidate: 0 }
    );
    return res.data;
  } catch {
    return [];
  }
}

export async function getUnreadCount(): Promise<number> {
  try {
    const res = await strapiFetch<{ data: { count: number } }>('/notifications/unread-count', {
      revalidate: 0,
    });
    return res.data.count;
  } catch {
    return 0;
  }
}

export async function markAllRead(): Promise<void> {
  try {
    await strapiFetch('/notifications/mark-read', { method: 'POST', body: {} });
  } catch {
    /* 静默失败：标记已读非关键路径 */
  }
}
