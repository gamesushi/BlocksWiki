'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { createChannel } from '@/app/actions/channels';

export function NewChannelForm() {
  const t = useTranslations('Channel');
  const tc = useTranslations('Common');
  const [state, action, pending] = useActionState(createChannel, null);

  return (
    <form action={action} className="flex items-center gap-2">
      <input
        name="title"
        placeholder={tc('newChannelPlaceholder')}
        className="bw-input w-44"
      />
      <select
        name="visibility"
        defaultValue="public"
        className="bw-select"
      >
        <option value="public">{t('public')}</option>
        <option value="private">{t('private')}</option>
      </select>
      <button
        type="submit"
        disabled={pending}
        className="bw-btn"
      >
        {pending ? t('creating') : t('create')}
      </button>
      {state?.error && <span className="text-xs text-error">{state.error}</span>}
    </form>
  );
}
