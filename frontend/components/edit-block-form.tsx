'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BlockEditor } from '@/components/block-editor';
import { updateBlock } from '@/app/actions/blocks';
import type { EditorJsOutput } from '@/lib/types';

export function EditBlockForm({
  documentId,
  initialData,
}: {
  documentId: string;
  initialData: EditorJsOutput;
}) {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="text-lg font-medium tracking-tight">编辑 Block</h1>
        <Link href={`/block/${documentId}`} className="text-sm text-neutral-400 hover:text-neutral-900">
          ← 取消
        </Link>
      </header>
      <BlockEditor
        initialData={initialData}
        submitLabel="保存修改"
        onSubmit={(output: EditorJsOutput) => updateBlock(documentId, output)}
        onPublished={() => router.push(`/block/${documentId}`)}
      />
    </main>
  );
}
