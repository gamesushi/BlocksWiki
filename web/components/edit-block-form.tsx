'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BlockEditor, type BlockEditorHandle } from '@/components/block-editor';
import { updateBlock } from '@/app/actions/blocks';
import type { EditorJsOutput } from '@/lib/types';

export function EditBlockForm({
  documentId,
  initialData,
  initialTitle = '',
  initialDescription = '',
}: {
  documentId: string;
  initialData: EditorJsOutput;
  initialTitle?: string;
  initialDescription?: string;
}) {
  const router = useRouter();
  const editorRef = useRef<BlockEditorHandle>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 p-6 backdrop-blur-sm"
      onClick={() => router.push(`/block/${documentId}`)}
    >
      <div
        className="flex h-[80vh] w-full max-w-4xl flex-col rounded-xl border border-blue-300 bg-neutral-50 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            editorRef.current?.submit();
          }
          if (e.key === 'Escape') router.push(`/block/${documentId}`);
        }}
      >
        {/* 标题 & 描述区 */}
        <div className="shrink-0 border-b border-neutral-200 px-6 pt-5 pb-3">
          <input
            defaultValue={initialTitle}
            placeholder="Title"
            className="mb-2 w-full bg-transparent text-2xl font-bold outline-none placeholder:text-neutral-300"
          />
          <textarea
            defaultValue={initialDescription}
            placeholder="Description"
            rows={2}
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-neutral-300"
          />
        </div>

        {/* Editor.js 编辑器主体 */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <BlockEditor
            ref={editorRef}
            embedded
            initialData={initialData}
            submitLabel="保存修改"
            onSubmit={(output: EditorJsOutput) => updateBlock(documentId, output)}
            onPublished={() => router.push(`/block/${documentId}`)}
          />
        </div>

        {/* 底部栏 */}
        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3">
          <Link
            href={`/block/${documentId}`}
            className="rounded border border-neutral-300 px-3 py-1 text-xs text-neutral-500 hover:border-neutral-900 hover:text-neutral-900"
          >
            ← 取消
          </Link>
          <button
            type="button"
            onClick={() => editorRef.current?.submit()}
            className="rounded-md bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            保存修改
          </button>
        </div>
      </div>
    </div>
  );
}
