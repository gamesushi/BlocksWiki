'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { createChannel, type CreateChannelState } from '@/app/actions/channels';

export function NewChannelForm() {
  const [state, action, pending] = useActionState<CreateChannelState, FormData>(createChannel, null);
  const t = useTranslations('Common');
  const tc = useTranslations('Channel');

  return (
    <form action={action} className="flex items-center gap-2">
      <input
        name="title"
        placeholder={tc('newChannelPlaceholder')}
        className="w-44 rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-xs outline-none focus:border-neutral-400"
      />
      <select
        name="visibility"
        defaultValue="public"
        className="rounded-full border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-600 outline-none"
      >
        <option value="public">{t('public')}</option>
        <option value="private">{t('private')}</option>
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:border-neutral-900 disabled:opacity-40"
      >
        {pending ? t('creating') : t('create')}
      </button>
      {state?.error && <span className="text-xs text-red-500">{state.error}</span>}
    </form>
  );
}
