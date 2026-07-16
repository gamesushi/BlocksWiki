import Link from '@/i18n/navigation';

/** Are.na 式 Grid / Table / Read 视图切换（走 ?view= 查询，SSR 友好、可分享）。 */
export function ViewToggle({ slug, current }: { slug: string; current: 'grid' | 'table' | 'read' }) {
  const item = (view: 'grid' | 'table' | 'read', label: string) => (
    <Link
      href={`/channel/${slug}${view === 'grid' ? '' : `?view=${view}`}`}
      scroll={false}
      className={current === view ? 'font-medium text-base-content' : 'text-base-content/50 hover:text-base-content'}
    >
      {label}
    </Link>
  );
  return (
      <div className="flex items-center gap-3 text-sm">
      <span className="text-xs uppercase tracking-widest text-base-content/30">View</span>
      {item('grid', 'Grid')}
      {item('table', 'Table')}
      {item('read', 'Read')}
    </div>
  );
}
