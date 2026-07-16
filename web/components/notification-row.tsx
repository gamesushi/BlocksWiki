import Link from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import type { AppNotification } from '@/lib/notification-types';
import { TimeAgo } from '@/components/time-ago';

export function NotificationRow({ n }: { n: AppNotification }) {
  const t = useTranslations('Notifications');
  const ch = n.targetChannelTitle ?? t('channelFallback');

  /** 依 type 组装文案与链接目标 */
  const describe = (n: AppNotification): { text: string; href: string } => {
    switch (n.type) {
      case 'connect_block':
        return { text: t('connectBlock', { ch }), href: n.targetChannelSlug ? `/channel/${n.targetChannelSlug}` : '#' };
      case 'connect_to_channel':
        return { text: t('connectToChannel', { ch }), href: n.targetChannelSlug ? `/channel/${n.targetChannelSlug}` : '#' };
      case 'connect_channel_to_channel':
        return { text: t('connectChannelToChannel', { ch }), href: n.targetChannelSlug ? `/channel/${n.targetChannelSlug}` : '#' };
      case 'follow_user':
        return { text: t('followUser'), href: `/user/${n.actorName}` };
      case 'follow_channel':
        return { text: t('followChannel', { ch }), href: n.targetChannelSlug ? `/channel/${n.targetChannelSlug}` : '#' };
      case 'add_collaborator':
        return { text: t('addCollaborator', { ch }), href: n.targetChannelSlug ? `/channel/${n.targetChannelSlug}` : '#' };
      case 'comment_on_block':
        return { text: t('commentOnBlock'), href: n.targetBlockId ? `/block/${n.targetBlockId}` : '#' };
      default:
        return { text: t('default'), href: '#' };
    }
  };

  const { text, href } = describe(n);
  return (
    <li className={`flex items-start gap-3 py-3 ${n.read ? '' : 'bg-blue-50/50'} -mx-3 px-3`}>
      {!n.read && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />}
      {n.read && <span className="mt-2 h-1.5 w-1.5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-neutral-700">
          <Link href={`/user/${n.actorName}`} className="font-medium text-neutral-900 hover:text-neutral-500">
            {n.actorName}
          </Link>{' '}
          <Link href={href} className="hover:text-neutral-900">{text}</Link>
        </p>
        <p className="mt-0.5 text-xs text-neutral-400"><TimeAgo date={n.createdAt} /></p>
      </div>
    </li>
  );
}
