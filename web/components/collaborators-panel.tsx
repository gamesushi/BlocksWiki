'use client';

/**
 * 频道主的协作者管理面板（仅属主渲染）。
 * closed/private 频道靠协作者授予他人连结权；public 频道任何人可连，此面板对 public 仅作展示。
 */
import { useState, useTransition } from 'react';
import { manageCollaborator } from '@/app/actions/channels';

export function CollaboratorsPanel({
  channelId,
  channelSlug,
  initialNames,
  visibility,
}: {
  channelId: string;
  channelSlug: string;
  initialNames: string[];
  visibility: 'public' | 'closed' | 'private';
}) {
  const [names, setNames] = useState<string[]>(initialNames);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (username: string, action: 'add' | 'remove') => {
    setError(null);
    startTransition(async () => {
      const res = await manageCollaborator(channelId, channelSlug, username, action);
      if (res.ok) {
        setNames(res.names ?? names);
        if (action === 'add') setInput('');
      } else {
        setError(res.error ?? '操作失败。');
      }
    });
  };

  return (
    <section className="mb-10 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <h2 className="mb-1 text-xs uppercase tracking-widest text-neutral-400">协作者</h2>
      <p className="mb-3 text-xs text-neutral-400">
        {visibility === 'public'
          ? '公开频道任何登录用户都能连结；协作者设置对连结权无额外作用。'
          : '仅属主与以下协作者可向该频道连结 Block。'}
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {names.length === 0 && <span className="text-xs text-neutral-400">暂无协作者</span>}
        {names.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-600"
          >
            {name}
            <button
              type="button"
              onClick={() => run(name, 'remove')}
              disabled={isPending}
              className="text-neutral-300 hover:text-red-500 disabled:opacity-40"
              title="移除协作者"
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) run(input, 'add');
        }}
        className="flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="用户名"
          className="w-40 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-neutral-400"
        />
        <button
          type="submit"
          disabled={isPending || !input.trim()}
          className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:border-neutral-900 disabled:opacity-40"
        >
          {isPending ? '…' : '+ 添加'}
        </button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </form>
    </section>
  );
}
