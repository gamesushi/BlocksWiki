import type { StrapiDoc } from './strapi';

export type NotificationType =
  | 'connect_block'
  | 'connect_to_channel'
  | 'connect_channel_to_channel'
  | 'follow_user'
  | 'follow_channel'
  | 'add_collaborator'
  | 'comment_on_block';

export type AppNotification = StrapiDoc<{
  recipientName: string;
  actorName: string;
  type: NotificationType;
  read: boolean;
  targetBlockId?: string | null;
  targetChannelSlug?: string | null;
  targetChannelTitle?: string | null;
}>;
