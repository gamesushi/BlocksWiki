'use client';

import Link from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { BlockEditor } from '@/components/block-editor';

export default function PublishPage() {
  const router = useRouter();
  const tp = useTranslations('Publish');
  const tc = useTranslations('Common');

  return (
    <main className="w-full px-6 py-10 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">{tp('title')}</h1>
          <Link href="/" className="text-sm bw-muted hover:text-base-content">{tc('back')}</Link>
        </header>
        <BlockEditor onPublished={(documentId) => router.push(`/block/${documentId}`)} />
      </div>
    </main>
  );
}
