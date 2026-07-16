'use client';

import { useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import Link from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { BlockEditor, type BlockEditorHandle } from '@/components/block-editor';
import { updateBlock } from '@/app/actions/blocks';
import type { EditorJsOutput } from '@/lib/types';

export function EditBlockForm({
  documentId,
  initialData,
  initialDescription = '',
  initialCoverUrl = '',
}: {
  documentId: string;
  initialData: EditorJsOutput;
  initialDescription?: string;
  initialCoverUrl?: string;
}) {
  const router = useRouter();
  const editorRef = useRef<BlockEditorHandle>(null);
  const [coverUrl, setCoverUrl] = useState<string>(initialCoverUrl);
  const t = useTranslations('Form');
  const tBlock = useTranslations('Block');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base-100/70 p-6 backdrop-blur-sm"
      onClick={() => router.push(`/block/${documentId}`)}
    >
      <div
        className="flex h-[80vh] w-full max-w-4xl flex-col rounded-xl border border-primary/40 bg-base-100 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            editorRef.current?.submit();
          }
          if (e.key === 'Escape') router.push(`/block/${documentId}`);
        }}
      >
        {/* 题图 + 描述区 */}
        <div className="shrink-0 space-y-3 border-b border-base-300 px-6 pb-3 pt-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-base-content/60">
              {tBlock('coverUrlLabel')}
            </label>
            <input
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder={tBlock('coverUrlPlaceholder')}
              className="bw-input w-full"
            />
          </div>
          <textarea
            defaultValue={initialDescription}
            placeholder="Description"
            rows={2}
            className="w-full resize-none bg-transparent text-sm text-base-content outline-none placeholder:text-base-content/40"
          />
        </div>

        {/* Editor.js 编辑器主体 */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <BlockEditor
            ref={editorRef}
            embedded
            initialData={initialData}
            initialCoverUrl={initialCoverUrl}
            submitLabel={t('saveChanges')}
            onSubmit={(output: EditorJsOutput) =>
              updateBlock(documentId, output, coverUrl.trim())
            }
            onPublished={() => router.push(`/block/${documentId}`)}
          />
        </div>

        {/* 底部栏 */}
        <div className="flex items-center justify-between border-t border-base-300 px-4 py-3">
          <Link
            href={`/block/${documentId}`}
            className="bw-btn-ghost text-xs"
          >
            {t('cancelBack')}
          </Link>
          <button
            type="button"
            onClick={() => editorRef.current?.submit()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-content shadow-sm transition-colors hover:bg-primary/90"
          >
            {t('saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
}
