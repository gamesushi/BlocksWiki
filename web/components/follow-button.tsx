'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { followUser, followChannel } from '@/app/actions/follow';

/** 关注/取关按钮（用户或频道）。乐观切换，失败回滚。 */
export function FollowButton(
  props:
    | { kind: 'user'; username: string; initialFollowing: boolean }
    | { kind: 'channel'; channelId: string; slug: string; initialFollowing: boolean }
) {
  const [following, setFollowing] = useState(props.initialFollowing);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('Follow');

  const toggle = () => {
    const next = !following;
    setFollowing(next);
    startTransition(async () => {
      const action = next ? 'follow' : 'unfollow';
      const res =
        props.kind === 'user'
          ? await followUser(props.username, action)
          : await followChannel(props.channelId, props.slug, action);
      if (!res.ok) {
        setFollowing(!next);
        alert(res.error);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className={`rounded-full px-3 py-1 text-xs transition-colors disabled:opacity-40 ${
        following
          ? 'border border-error/30 text-error hover:bg-error/10'
          : 'bw-btn'
      }`}
    >
      {following ? t('following') : t('follow')}
    </button>
  );
}
