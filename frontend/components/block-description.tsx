'use client';

/**
 * Block 描述：作者可就地编辑的一段补充说明，独立于正文内容。
 * 非作者只读展示（无描述则不渲染任何东西）；作者永远看到编辑入口。
 */
import { useState, useTransition } from 'react';
import { updateBlockDescription } from '@/app/actions/blocks';

export function BlockDescription({
  blockId,
  initialDescription,
  isAuthor,
}: {
  blockId: string;
  initialDescription: string;
  isAuthor: boolean;
}) {
  const [description, setDescription] = useState(initialDescription);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isAuthor && !description) return null;

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateBlockDescription(blockId, draft.trim());
      if (result.ok) {
        setDescription(draft.trim());
        setEditing(false);
      } else {
        setError(result.error ?? '保存失败。');
      }
    });
  };

  if (editing) {
    return (
      <div className="mb-6">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="给这个 Block 补充一段说明…"
          rows={3}
          autoFocus
          className="w-full resize-none rounded-lg border border-neutral-200 bg-white p-3 text-sm leading-relaxed text-neutral-700 outline-none focus:border-neutral-400"
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs text-white disabled:opacity-40"
          >
            {isPending ? '保存中…' : '保存'}
          </button>
          <button
            type="button"
            onClick={() => { setDraft(description); setEditing(false); setError(null); }}
            className="rounded-full border border-neutral-200 px-4 py-1.5 text-xs text-neutral-500 hover:border-neutral-400"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {description ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-500">{description}</p>
      ) : isAuthor ? null : null}
      {isAuthor && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1 text-xs text-neutral-300 hover:text-neutral-600"
        >
          {description ? '编辑描述' : '+ 添加描述'}
        </button>
      )}
    </div>
  );
}
