/**
 * 生成一条站内通知。自己触发自己的动作不通知；空 recipient 跳过。
 * 全反规范化字段，无关系写入 —— 生成成本极低，失败不影响主流程。
 */
export type NotifyType =
  | 'connect_block'
  | 'connect_to_channel'
  | 'connect_channel_to_channel'
  | 'follow_user'
  | 'follow_channel'
  | 'add_collaborator'
  | 'comment_on_block';

export async function notify(
  strapi: any,
  data: {
    recipientName?: string | null;
    actorName: string;
    type: NotifyType;
    targetBlockId?: string;
    targetChannelSlug?: string;
    targetChannelTitle?: string;
  }
): Promise<void> {
  if (!data.recipientName || data.recipientName === data.actorName) return;
  try {
    await strapi.documents('api::notification.notification').create({
      data: { ...data, read: false },
    });
  } catch (err: any) {
    strapi.log.warn(`[notify] 生成通知失败：${err?.message}`);
  }
}
