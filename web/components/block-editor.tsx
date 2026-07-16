'use client';

/**
 * Editor.js 输入端。产出纯净的 OutputData JSON，直接交给 createBlock server action。
 * 依赖: @editorjs/editorjs @editorjs/header @editorjs/list @editorjs/quote @editorjs/image
 * block→block 链接用本地 BlockLinkInlineTool（替代 @editorjs/link）。
 */
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useTranslations } from 'next-intl';
import type EditorJS from '@editorjs/editorjs';
import { BlockLinkInlineTool } from '@/components/block-link-inline-tool';
import { createBlock } from '@/app/actions/blocks';
import type { EditorJsOutput } from '@/lib/types';

const HOLDER_ID = 'blockwiki-editor';

export type BlockEditorSubmit = (
  output: EditorJsOutput,
) => Promise<{ ok: boolean; error?: string; documentId?: string }>;

export interface BlockEditorHandle {
  /** 从外部触发表单提交（Editor.js save → onSubmit 回调） */
  submit: () => void;
}

interface BlockEditorProps {
  onPublished?: (documentId: string) => void;
  initialData?: EditorJsOutput;
  onSubmit?: BlockEditorSubmit;
  submitLabel?: string;
  /** 嵌入扩展板等外层容器时隐藏自身边框与提交按钮，由父组件控制 */
  embedded?: boolean;
}

/**
 * Editor.js 输入端，创建与编辑共用。
 * - 无 onSubmit：创建模式，默认调 createBlock。
 * - 传 initialData + onSubmit：编辑模式，载入现有内容，保存走自定义 action。
 */
export const BlockEditor = forwardRef<BlockEditorHandle, BlockEditorProps>(
  function BlockEditor(
    { onPublished, initialData, onSubmit, submitLabel, embedded = false },
    ref,
  ) {
    const editorRef = useRef<EditorJS | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const t = useTranslations('Block');
    const tc = useTranslations('Common');
    const te = useTranslations('Errors');

    const submit = () => {
      setError(null);
      startTransition(async () => {
        const editor = editorRef.current;
        if (!editor) return;

        const output = (await editor.save()) as EditorJsOutput;
        if (output.blocks.length === 0) {
          setError(te('emptyContent'));
          return;
        }

        if (onSubmit) {
          const result = await onSubmit(output);
          if (result.ok) onPublished?.(result.documentId ?? '');
          else setError(result.error ?? te('saveFailedShort'));
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

    useImperativeHandle(ref, () => ({ submit }), [submit]);

    useEffect(() => {
      let destroyed = false;

      // Editor.js 只能跑在浏览器，动态 import 避开 SSR
      (async () => {
        const [
          { default: EditorJSClass },
          { default: Header },
          { default: List },
          { default: Quote },
          { default: ImageTool },
        ] = await Promise.all([
          import('@editorjs/editorjs'),
          import('@editorjs/header'),
          import('@editorjs/list'),
          import('@editorjs/quote'),
          import('@editorjs/image'),
        ]);
        if (destroyed) return;

        editorRef.current = new EditorJSClass({
          holder: HOLDER_ID,
          placeholder: t('editorPlaceholder'),
          minHeight: 120,
          ...(initialData ? { data: initialData as any } : {}),
          tools: {
            paragraph: { inlineToolbar: ['blockLink', 'bold', 'italic'] },
            header: {
              class: Header,
              config: { levels: [2, 3], defaultLevel: 2 },
              inlineToolbar: ['blockLink', 'bold', 'italic'],
            },
            list: { class: List, inlineToolbar: ['blockLink', 'bold', 'italic'] },
            quote: { class: Quote, inlineToolbar: ['blockLink', 'bold', 'italic'] },
            blockLink: {
              // 选中文字 → 弹搜索框 → 选 block → 包成 /block/<id> 链接，
              // 由 reconcile 在保存时自动建 Connection 边并记反链。
              class: BlockLinkInlineTool,
            },
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

    return (
      <div>
        <div
          id={HOLDER_ID}
          className={
            embedded
              ? 'min-h-[40vh]'
              : 'min-h-[420px] rounded-xl border border-base-300 bg-base-100 p-6 lg:p-8'
          }
        />
        {error && <p className="mt-3 text-sm text-error">{error}</p>}
        {!embedded && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={submit}
              disabled={isPending}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-content shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              {isPending ? tc('saving') : (submitLabel ?? t('publishBlock'))}
            </button>
          </div>
        )}
      </div>
    );
  },
);
