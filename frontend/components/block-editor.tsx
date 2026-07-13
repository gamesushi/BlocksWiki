'use client';

/**
 * Editor.js 输入端。产出纯净的 OutputData JSON，直接交给 createBlock server action。
 * 依赖: @editorjs/editorjs @editorjs/header @editorjs/list @editorjs/quote @editorjs/image
 */
import { useEffect, useRef, useState, useTransition } from 'react';
import type EditorJS from '@editorjs/editorjs';
import { createBlock } from '@/app/actions/blocks';
import type { EditorJsOutput } from '@/lib/types';

const HOLDER_ID = 'blockwiki-editor';

export type BlockEditorSubmit = (
  output: EditorJsOutput
) => Promise<{ ok: boolean; error?: string; documentId?: string }>;

/**
 * Editor.js 输入端，创建与编辑共用。
 * - 无 onSubmit：创建模式，默认调 createBlock。
 * - 传 initialData + onSubmit：编辑模式，载入现有内容，保存走自定义 action。
 */
export function BlockEditor({
  onPublished,
  initialData,
  onSubmit,
  submitLabel,
}: {
  onPublished?: (documentId: string) => void;
  initialData?: EditorJsOutput;
  onSubmit?: BlockEditorSubmit;
  submitLabel?: string;
}) {
  const editorRef = useRef<EditorJS | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let destroyed = false;

    // Editor.js 只能跑在浏览器，动态 import 避开 SSR
    (async () => {
      const [{ default: EditorJSClass }, { default: Header }, { default: List }, { default: Quote }, { default: ImageTool }] =
        await Promise.all([
          import('@editorjs/editorjs'),
          import('@editorjs/header'),
          import('@editorjs/list'),
          import('@editorjs/quote'),
          import('@editorjs/image'),
        ]);
      if (destroyed) return;

      editorRef.current = new EditorJSClass({
        holder: HOLDER_ID,
        placeholder: '记录一条生活心得…',
        minHeight: 120,
        ...(initialData ? { data: initialData as any } : {}),
        tools: {
          header: { class: Header, config: { levels: [2, 3], defaultLevel: 2 } },
          list: { class: List, inlineToolbar: true },
          quote: Quote,
          image: {
            class: ImageTool,
            config: {
              // Strapi upload 插件作为图床；返回值适配 Editor.js image tool 契约
              uploader: {
                async uploadByFile(file: File) {
                  const form = new FormData();
                  form.append('files', file);
                  const res = await fetch('/api/upload-proxy', { method: 'POST', body: form });
                  if (!res.ok) return { success: 0 };
                  const [uploaded] = await res.json();
                  return { success: 1, file: { url: uploaded.url } };
                },
              },
            },
          },
        },
      });
    })();

    return () => {
      destroyed = true;
      editorRef.current?.destroy?.();
      editorRef.current = null;
    };
    // initialData 只在挂载时载入一次；后续保存不重建编辑器
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const editor = editorRef.current;
      if (!editor) return;

      const output = (await editor.save()) as EditorJsOutput;
      if (output.blocks.length === 0) {
        setError('内容为空。');
        return;
      }

      if (onSubmit) {
        const result = await onSubmit(output);
        if (result.ok) onPublished?.(result.documentId ?? '');
        else setError(result.error ?? '保存失败。');
        return;
      }

      const hasImage = output.blocks.some((b) => b.type === 'image');
      const result = await createBlock(output, hasImage ? 'image' : 'text');
      if (result.ok) {
        await editor.clear();
        onPublished?.(result.block.documentId);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="mx-auto max-w-xl">
      <div id={HOLDER_ID} className="min-h-[120px] rounded-lg border border-neutral-200 bg-white p-4" />
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="mt-3 rounded-full bg-neutral-900 px-5 py-2 text-sm text-white disabled:opacity-40"
      >
        {isPending ? '保存中…' : (submitLabel ?? '发布 Block')}
      </button>
    </div>
  );
}
