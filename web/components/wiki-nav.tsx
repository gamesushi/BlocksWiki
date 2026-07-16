import Link from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import type { WikiTreeNode } from '@/lib/types';

type TreeItem = WikiTreeNode & { children: TreeItem[] };

function buildTree(nodes: WikiTreeNode[]): TreeItem[] {
  const byId = new Map<string, TreeItem>();
  nodes.forEach((n) => byId.set(n.documentId, { ...n, children: [] }));
  const roots: TreeItem[] = [];
  for (const item of byId.values()) {
    if (item.parentId && byId.has(item.parentId)) byId.get(item.parentId)!.children.push(item);
    else roots.push(item);
  }
  const sortRec = (list: TreeItem[]) => {
    list.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    list.forEach((i) => sortRec(i.children));
  };
  sortRec(roots);
  return roots;
}

function NavList({ items, activeSlug, depth }: { items: TreeItem[]; activeSlug?: string; depth: number }) {
  const t = useTranslations('Wiki');
  return (
    <ul className={depth > 0 ? 'ml-3 border-l border-neutral-100 pl-3' : ''}>
      {items.map((item) => {
        const active = item.slug === activeSlug;
        return (
          <li key={item.documentId} className="py-0.5">
            <Link
              href={`/wiki/${item.slug}`}
              className={`block truncate rounded px-2 py-1 text-sm ${
                active ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {item.title}
              {!item.published && <span className="ml-1 text-[10px] text-amber-500">{t('draft')}</span>}
            </Link>
            {item.children.length > 0 && (
              <NavList items={item.children} activeSlug={activeSlug} depth={depth + 1} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function WikiNav({ nodes, activeSlug }: { nodes: WikiTreeNode[]; activeSlug?: string }) {
  const t = useTranslations('Wiki');
  const tree = buildTree(nodes);
  return (
    <nav className="text-sm">
      <Link href="/wiki" className="mb-3 block text-xs uppercase tracking-widest text-neutral-400 hover:text-neutral-900">
        Wiki
      </Link>
      {tree.length === 0 ? (
        <p className="text-xs text-neutral-400">{t('navEmpty')}</p>
      ) : (
        <NavList items={tree} activeSlug={activeSlug} depth={0} />
      )}
    </nav>
  );
}
