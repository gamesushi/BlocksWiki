'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BlockEditor } from '@/components/block-editor';

export default function PublishPage() {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="text-lg font-medium tracking-tight">发布 Block</h1>
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-900">← 返回</Link>
      </header>
      <BlockEditor onPublished={(documentId) => router.push(`/block/${documentId}`)} />
    </main>
  );
}
