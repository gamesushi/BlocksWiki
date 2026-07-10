'use client';

/**
 * Are.na 式 expand editor：大编辑器，markdown 书写。
 * 左侧正文始终可编辑；左下角"预览"切换右侧实时渲染面板（原始 markdown ↔ 渲染后并排，
 * 而非替换成只读预览 —— 保证任何时候都能改）。右下角 Add block（⌘⏎）。
 * 标题作为 header 块前置，正文按 markdown 解析。
 */
import { useEffect, useRef, useState, useTransition } from 'react';
import { addBlockToChannel } from '@/app/actions/channel';
import { markdownToEditorJs, editorJsToHtml } from '@/lib/markdown';
import type { EditorJsOutput } from '@/lib/types';

const PREVIEW_CLS =
  'wiki-md text-sm leading-relaxed text-neutral-700 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-neutral-200 [&_code]:px-1 [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-medium [&_h4]:mt-2 [&_h4]:text-base [&_h4]:font-medium [&_img]:my-2 [&_img]:rounded [&_li]:ml-5 [&_li]:list-disc [&_ol_li]:list-decimal [&_p]:my-2';

export function ExpandedEditor({
  channelId,
  channelSlug,
  initialTitle = '',
  initialBody = '',
  onClose,
  onAdded,
}: {
  channelId: string;
  channelSlug: string;
  initialTitle?: string;
  initialBody?: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bodyRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const buildContent = (): { content: EditorJsOutput; blockType: 'text' | 'image' } => {
    const parsed = markdownToEditorJs(body);
    const blocks = parsed.blocks;
    if (title.trim()) blocks.unshift({ type: 'header', data: { text: title.trim(), level: 1 } });
    const blockType = blocks.some((b) => b.type === 'image') ? 'image' : 'text';
    return { content: { ...parsed, blocks }, blockType };
  };

  const submit = () => {
    setError(null);
    const { content, blockType } = buildContent();
    if (!content.blocks.length) {
      setError('内容为空。');
      return;
    }
    startTransition(async () => {
      const result = await addBlockToChannel(channelId, channelSlug, content, blockType);
      if (result.ok) onAdded();
      else setError(result.error ?? '添加失败。');
    });
  };

  const previewHtml = showPreview ? editorJsToHtml(buildContent().content) : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
        className="flex h-[80vh] w-full max-w-4xl flex-col rounded-xl border border-blue-300 bg-neutral-50 shadow-xl"
      >
        <div className="flex min-h-0 flex-1">
          {/* 左：始终可编辑 */}
          <div className={`flex min-h-0 flex-col overflow-y-auto p-6 ${showPreview ? 'w-1/2 border-r border-neutral-200' : 'w-full'}`}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="标题"
              className="mb-3 w-full shrink-0 bg-transparent text-2xl font-bold outline-none placeholder:text-neutral-300"
            />
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="用 Markdown 书写…（# 标题、## 二级、**粗体**、*斜体*、- 列表、> 引用、[链接](url)、![图](url)）"
              className="min-h-0 flex-1 w-full resize-none bg-transparent font-mono text-sm leading-relaxed outline-none placeholder:font-sans placeholder:text-neutral-300"
            />
          </div>

          {/* 右：实时渲染预览（可选） */}
          {showPreview && (
            <div className="w-1/2 overflow-y-auto bg-white p-6">
              <div
                className={PREVIEW_CLS}
                dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-neutral-300">（暂无内容）</p>' }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            title="并排显示渲染后的 Markdown 预览（正文始终可编辑）"
            className={`rounded border px-2 py-1 text-xs ${
              showPreview
                ? 'border-neutral-900 text-neutral-900'
                : 'border-neutral-300 text-neutral-500 hover:border-neutral-900 hover:text-neutral-900'
            }`}
          >
            {showPreview ? '✎ 仅编辑' : 'M↓ 预览'}
          </button>

          <div className="flex items-center gap-3">
            {error && <span className="text-xs text-red-500">{error}</span>}
            <button
              type="button"
              onClick={submit}
              disabled={isPending}
              className="flex items-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {isPending ? '添加中…' : 'Add block'}
              <span className="text-xs opacity-70">⌘⏎</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
