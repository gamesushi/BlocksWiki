import { redirect } from 'next/navigation';
import { getSession } from '@/app/actions/auth';
import { getWikiTree } from '@/app/actions/wiki';
import { WikiEditor } from '@/components/wiki-editor';

export const dynamic = 'force-dynamic';

export default async function NewWikiPage() {
  const [session, nodes] = await Promise.all([getSession(), getWikiTree()]);
  if (!session?.me.isAdmin) redirect('/wiki');

  return (
    <WikiEditor
      mode="new"
      nodes={nodes}
      initial={{ title: '', introText: '', published: false, parent: null, order: 0, items: [] }}
    />
  );
}
