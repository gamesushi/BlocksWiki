'use client';

/**
 * 频道编辑表单（client component）：点击「编辑」就地展开，
 * 保存/取消收起。保存成功后服务端 revalidate，标题/描述/可见性即时刷新。
 */
import { useEffect, useActionState, useState } from 'react';
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
        className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-400 hover:border-neutral-400 hover:text-neutral-600"
      >
        编辑
      </button>
    );
  }

  return (
    <form action={action} className="w-full max-w-lg space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div>
        <label className="mb-1 block text-xs text-neutral-500">标题</label>
        <input
          name="title"
          defaultValue={title}
          placeholder="Channel 名称"
          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">描述</label>
        <textarea
          name="description"
          defaultValue={description}
          rows={3}
          placeholder="这个频道是关于什么的？"
          className="w-full resize-none rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-500">可见性</label>
        <select
          name="visibility"
          defaultValue={visibility}
          className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 outline-none"
        >
          <option value="public">公开</option>
          <option value="closed">关闭（仅成员可见）</option>
          <option value="private">私密（仅属主与协作者）</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs text-white disabled:opacity-40"
        >
          {pending ? '保存中…' : '保存'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs text-neutral-600 hover:border-neutral-900"
        >
          取消
        </button>
        {state?.error && <span className="text-xs text-red-500">{state.error}</span>}
      </div>
    </form>
  );
}
