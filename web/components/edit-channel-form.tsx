'use client';

/**
 * 频道编辑表单（client component）：点击「编辑」就地展开，
 * 保存/取消收起。保存成功后服务端 revalidate，标题/描述/可见性即时刷新。
 */
import { useEffect, useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { updateChannel, type UpdateChannelState } from '@/app/actions/channels';

export function EditChannelForm({
  documentId,
  slug,
  title,
  description,
  visibility,
}: {
  documentId: string;
  slug: string;
  title: string;
  description: string;
  visibility: 'public' | 'closed' | 'private';
}) {
  const t = useTranslations('Common');
  const tc = useTranslations('Channel');
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<UpdateChannelState, FormData>(
    updateChannel.bind(null, documentId, slug),
    null
  );

  // 保存成功 → 收起表单（服务端已 revalidate，页面会用新数据重渲染）
  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bw-btn-ghost text-xs"
      >
        {tc('edit')}
      </button>
    );
  }

  return (
    <form action={action} className="bw-card w-full max-w-lg space-y-3 p-4">
      <div>
        <label className="mb-1 block text-xs text-base-content/60">{tc('titleLabel')}</label>
        <input
          name="title"
          defaultValue={title}
          placeholder={tc('namePlaceholder')}
          className="bw-input"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-base-content/60">{tc('descLabel')}</label>
        <textarea
          name="description"
          defaultValue={description}
          rows={3}
          placeholder={tc('descPlaceholder')}
          className="bw-textarea"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-base-content/60">{tc('visibilityLabel')}</label>
        <select
          name="visibility"
          defaultValue={visibility}
          className="bw-select"
        >
          <option value="public">{t('public')}</option>
          <option value="closed">{tc('visibilityClosed')}</option>
          <option value="private">{tc('visibilityPrivate')}</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bw-btn"
        >
          {pending ? t('saving') : t('save')}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="bw-btn-ghost"
        >
          {t('cancel')}
        </button>
        {state?.error && <span className="text-xs text-error">{state.error}</span>}
      </div>
    </form>
  );
}
