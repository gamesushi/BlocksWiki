import Link from 'next/link';
import type { AppNotification } from '@/lib/notification-types';

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} 小时前`;
  return `${Math.floor(hrs / 24)} 天前`;
}

/** 依 type 组装文案与链接目标 */
function describe(n: AppNotification): { text: React.ReactNode; href: string } {
  const ch = n.targetChannelTitle ?? '频道';
  switch (n.type) {
    case 'connect_block':
      return { text: <>连结了你的 Block 到「{ch}」</>, href: n.targetChannelSlug ? `/channel/${n.targetChannelSlug}` : '#' };
    case 'connect_to_channel':
      return { text: <>向你的频道「{ch}」添加了内容</>, href: n.targetChannelSlug ? `/channel/${n.targetChannelSlug}` : '#' };
    case 'connect_channel_to_channel':
      return { text: <>把一个频道连入了你的频道「{ch}」</>, href: n.targetChannelSlug ? `/channel/${n.targetChannelSlug}` : '#' };
    case 'follow_user':
      return { text: <>关注了你</>, href: `/user/${n.actorName}` };
    case 'follow_channel':
      return { text: <>关注了你的频道「{ch}」</>, href: n.targetChannelSlug ? `/channel/${n.targetChannelSlug}` : '#' };
    case 'add_collaborator':
      return { text: <>把你加为频道「{ch}」的协作者</>, href: n.targetChannelSlug ? `/channel/${n.targetChannelSlug}` : '#' };
    case 'comment_on_block':
      return { text: <>评论了你的 Block</>, href: n.targetBlockId ? `/block/${n.targetBlockId}` : '#' };
    default:
      return { text: <>有新动态</>, href: '#' };
  }
}

export function NotificationRow({ n }: { n: AppNotification }) {
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
        <p className="mt-0.5 text-xs text-neutral-400">{timeAgo(n.createdAt)}</p>
      </div>
    </li>
  );
}
