'use client';

/**
 * 快速采集器 —— PWA 主屏幕图标的落地页（start_url = /capture）。
 * 摩擦力预算：打开 → 点"粘贴"或直接打字 → 点"存入" ≤ 10 秒。
 *
 * - 剪贴板：iOS Safari 只允许在用户手势内 readText()，所以做成显式"粘贴"按钮
 *   （系统会弹一次轻量确认，这是 iOS 的硬性限制，无法绕过）。
 * - 离线：断网时写入 IndexedDB 队列，恢复网络或下次打开时自动补发。
 */
import { useEffect, useRef, useState, useTransition } from 'react';
import { createBlock } from '@/app/actions/blocks';
import { enqueueBlock, flushQueue, pendingCount } from '@/lib/offline-queue';
import type { EditorJsOutput } from '@/lib/types';

function textToContent(text: string): EditorJsOutput {
  return {
    time: Date.now(),
    version: 'capture-1',
    blocks: text
      .split(/\n{2,}/)
      .filter(Boolean)
      .map((para) => ({ type: 'paragraph', data: { text: para.trim() } })),
  };
}

export function QuickCapture() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [isSaving, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 打开即同步：补发离线队列，并刷新待发计数
  useEffect(() => {
    const sync = () => {
      flushQueue(async (item) => {
        const result = await createBlock(item.content, item.blockType);
        return result.ok;
      }).then(({ remaining }) => setPending(remaining));
    };
    sync();
    pendingCount().then(setPending);
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, []);

  const pasteFromClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) {
        setText((prev) => (prev ? `${prev}\n\n${clip}` : clip));
        textareaRef.current?.focus();
      }
    } catch {
      setStatus('剪贴板读取被拒绝，请长按输入框手动粘贴。');
    }
  };

  const save = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const content = textToContent(trimmed);

    startTransition(async () => {
      if (!navigator.onLine) {
        await enqueueBlock({ content, blockType: 'text', queuedAt: Date.now() });
        setPending((n) => n + 1);
        setText('');
        setStatus('离线已暂存，恢复网络后自动发布。');
        return;
      }

      const result = await createBlock(content, 'text');
      if (result.ok) {
        setText('');
        setStatus('已存入 ✓');
      } else {
        // 在线但失败（如 token 过期以外的瞬时错误）：降级进离线队列，不丢内容
        await enqueueBlock({ content, blockType: 'text', queuedAt: Date.now() });
        setPending((n) => n + 1);
        setText('');
        setStatus(`${result.error} 已暂存到本地队列。`);
      }
    });
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 px-5 py-8">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="此刻想记下什么？"
        rows={6}
        autoFocus
        className="w-full resize-none rounded-xl border border-neutral-200 bg-white p-4 text-base leading-relaxed outline-none focus:border-neutral-400"
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={pasteFromClipboard}
          className="rounded-full border border-neutral-300 px-4 py-2 text-sm text-neutral-600"
        >
          📋 粘贴
        </button>
        <button
          type="button"
          onClick={save}
          disabled={isSaving || !text.trim()}
          className="flex-1 rounded-full bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          {isSaving ? '存入中…' : '存入 BlockWiki'}
        </button>
      </div>

      <p className="min-h-5 text-xs text-neutral-400">
        {status}
        {pending > 0 && ` · ${pending} 条待同步`}
      </p>
    </div>
  );
}
