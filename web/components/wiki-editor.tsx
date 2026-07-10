'use client';

/**
 * 管理员 Wiki 页编排器。
 * items 支持三种：文本（纯文本→editorjs 段落）、Block 引用、Channel 引用；可增删、上下排序。
 * Block/Channel 通过搜索现有内容挑选（复用 searchBlocks/searchChannels）。
 */
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { searchBlocks, searchChannels } from '@/app/actions/search';
import { createWikiPage, updateWikiPage, deleteWikiPage } from '@/app/actions/wiki';
import { textToContent } from '@/lib/editorjs-text';
import type { WikiItem, WikiTreeNode } from '@/lib/types';

export type EditorItem =
  | { type: 'text'; text: string }
  | { type: 'block'; blockId: string; label: string; note: string }
  | { type: 'channel'; channelId: string; label: string; note: string };

export function WikiEditor({
  mode,
  documentId,
  slug,
  nodes,
  initial,
}: {
  mode: 'new' | 'edit';
  documentId?: string;
  slug?: string;
  nodes: WikiTreeNode[];
  initial: {
    title: string;
    introText: string;
    published: boolean;
    parent: string | null;
    order: number;
    items: EditorItem[];
  };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [introText, setIntroText] = useState(initial.introText);
  const [published, setPublished] = useState(initial.published);
  const [parent, setParent] = useState<string>(initial.parent ?? '');
  const [order, setOrder] = useState(initial.order);
  const [items, setItems] = useState<EditorItem[]>(initial.items);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // 内容搜索选择器状态
  const [pick, setPick] = useState<null | 'block' | 'channel'>(null);
  const [pickQuery, setPickQuery] = useState('');
  const [pickResults, setPickResults] = useState<{ id: string; label: string }[]>([]);
  const [picking, setPicking] = useState(false);

  const move = (i: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const remove = (i: number) => setItems((prev) => prev.filter((_, k) => k !== i));
  const addText = () => setItems((prev) => [...prev, { type: 'text', text: '' }]);
  const setItemField = (i: number, patch: Partial<EditorItem>) =>
    setItems((prev) => prev.map((it, k) => (k === i ? ({ ...it, ...patch } as EditorItem) : it)));

  const runPick = (kind: 'block' | 'channel', q: string) => {
    setPickQuery(q);
    if (!q.trim()) {
      setPickResults([]);
      return;
    }
    setPicking(true);
    startTransition(async () => {
      if (kind === 'block') {
        const res = await searchBlocks(q, 1);
        setPickResults(res.blocks.map((b) => ({ id: b.documentId, label: b.excerpt || '(空白 Block)' })));
      } else {
        const res = await searchChannels(q);
        setPickResults(res.map((c) => ({ id: c.documentId, label: c.title })));
      }
      setPicking(false);
    });
  };

  const addPicked = (id: string, label: string) => {
    if (pick === 'block') setItems((prev) => [...prev, { type: 'block', blockId: id, label, note: '' }]);
    else if (pick === 'channel') setItems((prev) => [...prev, { type: 'channel', channelId: id, label, note: '' }]);
    setPick(null);
    setPickQuery('');
    setPickResults([]);
  };

  const toWikiItems = (): WikiItem[] =>
    items
      .map((it): WikiItem | null => {
        if (it.type === 'text') {
          const content = textToContent(it.text);
          return content.blocks.length ? { type: 'text', content } : null;
        }
        if (it.type === 'block') return { type: 'block', blockId: it.blockId, note: it.note || undefined };
        return { type: 'channel', channelId: it.channelId, note: it.note || undefined };
      })
      .filter((x): x is WikiItem => x !== null);

  const save = () => {
    setError(null);
    if (!title.trim()) {
      setError('标题必填。');
      return;
    }
    startTransition(async () => {
      const payload = {
        title: title.trim(),
        intro: introText.trim() ? textToContent(introText) : null,
        items: toWikiItems(),
        published,
        parent: parent || null,
        order,
      };
      const result =
        mode === 'new'
          ? await createWikiPage(payload)
          : await updateWikiPage(documentId!, slug!, payload);
      if (result.ok) router.push(`/wiki/${result.slug}`);
      else setError(result.error);
    });
  };

  const onDelete = () => {
    if (mode !== 'edit' || !documentId) return;
    startTransition(async () => {
      const r = await deleteWikiPage(documentId);
      if (r.ok) router.push('/wiki');
      else setError(r.error ?? '删除失败。');
    });
  };

  const inputCls = 'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400';

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-8 text-lg font-medium tracking-tight">
        {mode === 'new' ? '新建 Wiki 页' : '编辑 Wiki 页'}
      </h1>

      <div className="space-y-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="页面标题" className={inputCls} />

        <textarea
          value={introText}
          onChange={(e) => setIntroText(e.target.value)}
          placeholder="引言（可选）"
          rows={3}
          className={`${inputCls} resize-none`}
        />

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2 text-neutral-600">
            父页面
            <select value={parent} onChange={(e) => setParent(e.target.value)} className="rounded-lg border border-neutral-200 px-2 py-1.5 text-sm">
              <option value="">（顶层）</option>
              {nodes
                .filter((n) => n.documentId !== documentId)
                .map((n) => (
                  <option key={n.documentId} value={n.documentId}>
                    {n.title}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-neutral-600">
            排序
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value) || 0)}
              className="w-16 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-neutral-600">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            发布
          </label>
        </div>
      </div>

      <h2 className="mb-3 mt-10 text-xs uppercase tracking-widest text-neutral-400">内容编排</h2>
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="rounded-lg border border-neutral-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-neutral-400">
                {it.type === 'text' ? '文本' : it.type === 'block' ? 'Block' : '频道'}
              </span>
              <span className="flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} className="px-1 text-neutral-400 hover:text-neutral-900">↑</button>
                <button type="button" onClick={() => move(i, 1)} className="px-1 text-neutral-400 hover:text-neutral-900">↓</button>
                <button type="button" onClick={() => remove(i)} className="px-1 text-neutral-300 hover:text-red-500">✕</button>
              </span>
            </div>
            {it.type === 'text' ? (
              <textarea
                value={it.text}
                onChange={(e) => setItemField(i, { text: e.target.value })}
                placeholder="编辑性文字…"
                rows={3}
                className={`${inputCls} resize-none`}
              />
            ) : (
              <div>
                <p className="mb-1 truncate text-sm text-neutral-700">{it.label}</p>
                <input
                  value={it.note}
                  onChange={(e) => setItemField(i, { note: e.target.value })}
                  placeholder="标注（可选）"
                  className={`${inputCls} text-xs`}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* 添加控件 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={addText} className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:border-neutral-900">+ 文本</button>
        <button type="button" onClick={() => { setPick('block'); setPickQuery(''); setPickResults([]); }} className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:border-neutral-900">+ Block</button>
        <button type="button" onClick={() => { setPick('channel'); setPickQuery(''); setPickResults([]); }} className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:border-neutral-900">+ 频道</button>
      </div>

      {pick && (
        <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <input
            autoFocus
            value={pickQuery}
            onChange={(e) => runPick(pick, e.target.value)}
            placeholder={pick === 'block' ? '搜索 Block…' : '搜索频道…'}
            className={inputCls}
          />
          <ul className="mt-2 max-h-48 overflow-y-auto">
            {picking && <li className="px-2 py-1.5 text-xs text-neutral-400">搜索中…</li>}
            {!picking && pickQuery.trim() && pickResults.length === 0 && (
              <li className="px-2 py-1.5 text-xs text-neutral-400">没有匹配</li>
            )}
            {pickResults.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => addPicked(r.id, r.label)}
                  className="block w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-white"
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-full bg-neutral-900 px-5 py-2 text-sm text-white disabled:opacity-40"
        >
          {isPending ? '保存中…' : '保存'}
        </button>
        {mode === 'edit' && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            className="rounded-full border border-neutral-200 px-4 py-2 text-xs text-neutral-400 hover:border-red-300 hover:text-red-500"
          >
            删除页面
          </button>
        )}
      </div>
    </main>
  );
}
