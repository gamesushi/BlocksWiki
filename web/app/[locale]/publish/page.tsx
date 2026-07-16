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
    <main className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-lg font-medium tracking-tight">{tp('title')}</h1>
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-900">{tc('back')}</Link>
      </header>
      <BlockEditor onPublished={(documentId) => router.push(`/block/${documentId}`)} />
    </main>
  );
}
