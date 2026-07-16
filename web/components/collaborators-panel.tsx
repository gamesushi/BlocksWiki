'use client';

/**
 * 频道主的协作者管理面板（仅属主渲染）。
 * closed/private 频道靠协作者授予他人连结权；public 频道任何人可连，此面板对 public 仅作展示。
 */
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
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
  const tc = useTranslations('Channel');
  const tf = useTranslations('Form');
  const te = useTranslations('Errors');
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
        setError(res.error ?? te('failed'));
      }
    });
  };

  return (
    <section className="bw-card mb-10 p-4">
      <h2 className="bw-sep">{tc('collaborators')}</h2>
      <p className="mb-3 text-xs bw-muted">
        {visibility === 'public'
          ? tc('collabPublic')
          : tc('collabRestricted')}
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {names.length === 0 && <span className="text-xs bw-muted">{tc('noCollaborators')}</span>}
        {names.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 rounded-full border border-base-300 bg-base-100 px-3 py-1 text-xs text-base-content/70"
          >
            {name}
            <button
              type="button"
              onClick={() => run(name, 'remove')}
              disabled={isPending}
              className="text-base-content/40 hover:text-error disabled:opacity-40"
              title={tc('removeCollaborator')}
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
          placeholder={tf('username')}
          className="w-40 rounded-full border border-base-300 bg-base-100 px-3 py-1.5 text-xs text-base-content outline-none transition focus:border-primary"
        />
        <button
          type="submit"
          disabled={isPending || !input.trim()}
          className="bw-btn-ghost"
        >
          {isPending ? '…' : tc('addCollaborator')}
        </button>
        {error && <span className="text-xs text-error">{error}</span>}
      </form>
    </section>
  );
}
