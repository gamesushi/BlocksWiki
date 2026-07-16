'use client';

/**
 * Are.na 式频道网格首格：就地新建 Block 并连结到本频道。
 * 支持：输入文字（⌘Enter）、粘贴 URL（图片/视频/链接自动识别）、粘贴/拖拽/选择图片文件、
 *       右下角 expand 打开大编辑器用 markdown 书写。
 * 仅对有连结权者渲染（由父级 canConnect 决定）。
 *
 * 注意：底部控件用 onMouseDown preventDefault 抢在 textarea 的 blur 之前，
 * 否则空内容时点按钮会先触发 blur→setActive(false)→按钮卸载→点击丢失。
 */
import { useRef, useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { addBlockToChannel, addTextToChannel } from '@/app/actions/channel';
import { isUrl, urlToBlock } from '@/lib/markdown';
import { ExpandedEditor } from '@/components/expanded-editor';
import type { EditorJsOutput } from '@/lib/types';

export function AddBlockTile({ channelId, channelSlug }: { channelId: string; channelSlug: string }) {
  const [active, setActive] = useState(false);
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const t = useTranslations('Common');
  const tErr = useTranslations('Errors');
  const tBlock = useTranslations('Block');

  const activate = () => {
    setActive(true);
    setError(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const done = () => {
    setText('');
    setActive(false);
    setStatus(null);
    router.refresh();
  };

  const submitContent = (
    content: EditorJsOutput,
    blockType: 'text' | 'image' | 'link',
    sourceUrl?: string
  ) => {
    startTransition(async () => {
      const result = await addBlockToChannel(channelId, channelSlug, content, blockType, sourceUrl);
      if (result.ok) done();
      else setError(result.error ?? tErr('addFailedShort'));
    });
  };

  const submitText = () => {
    const value = text.trim();
    if (!value) return;
    if (isUrl(value)) {
      const { block, blockType } = urlToBlock(value);
      submitContent({ time: Date.now(), version: 'tile-1', blocks: [block] }, blockType, value.trim());
      return;
    }
    startTransition(async () => {
      const result = await addTextToChannel(channelId, channelSlug, value);
      if (result.ok) done();
      else setError(result.error ?? tErr('addFailedShort'));
    });
  };

  const uploadImage = async (file: File) => {
    setError(null);
    setStatus(t('uploading'));
    try {
      const form = new FormData();
      form.append('files', file);
      const res = await fetch('/api/upload-proxy', { method: 'POST', body: form });
      if (!res.ok) throw new Error();
      const [uploaded] = await res.json();
      submitContent(
        { time: Date.now(), version: 'tile-1', blocks: [{ type: 'image', data: { file: { url: uploaded.url }, caption: '' } }] },
        'image'
      );
    } catch {
      setStatus(null);
      setError(tErr('imageUploadFailed'));
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'));
    if (file) {
      e.preventDefault();
      uploadImage(file);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
    if (file) uploadImage(file);
  };

  return (
    <li className="flex flex-col">
      <div
        onClick={!active ? activate : undefined}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative flex aspect-square flex-col rounded-lg border bg-base-100 ${
          dragOver ? 'border-primary bg-primary/10' : 'border-base-300'
        } ${active ? '' : 'cursor-pointer hover:border-primary/40'}`}
      >
        {active ? (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={onPaste}
            onBlur={() => { if (!text.trim() && !isPending && !expanded) setActive(false); }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submitText(); }
              if (e.key === 'Escape' && !text.trim()) setActive(false);
            }}
            disabled={isPending}
            placeholder={tBlock('tilePlaceholder')}
            // 底部留白给控件行，避免与占位符重叠
            className="h-full w-full resize-none rounded-lg bg-transparent px-4 pb-10 pt-4 text-sm leading-relaxed text-base-content outline-none placeholder:text-base-content/40"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center pb-8 text-2xl text-base-content/30">+</div>
        )}

        {/* 底部控件行：始终存在（含 idle），互不重叠 */}
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
          <span className="pointer-events-none rounded bg-base-200 px-1.5 py-0.5 text-[11px] text-base-content/50">
            {isPending || status ? (status ?? t('adding')) : '⌘ENTER'}
          </span>
          <span className="flex items-center gap-1.5">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              className="rounded bg-base-200 px-1.5 py-0.5 text-[11px] text-base-content/50 hover:text-base-content"
            >
              {tBlock('selectFile')}
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
              title={tBlock('expandTitle')}
              className="rounded bg-base-200 px-1.5 py-0.5 text-[11px] text-base-content/50 hover:text-base-content"
            >
              ⤢ {tBlock('expand')}
            </button>
          </span>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ''; }}
        />
      </div>
      {error && <p className="mt-1 text-[11px] text-error">{error}</p>}
      {expanded && (
        <ExpandedEditor
          channelId={channelId}
          channelSlug={channelSlug}
          initialBody={text}
          sourceUrl={isUrl(text) ? text.trim() : undefined}
          onClose={() => setExpanded(false)}
          onAdded={() => { setExpanded(false); done(); }}
        />
      )}
    </li>
  );
}
