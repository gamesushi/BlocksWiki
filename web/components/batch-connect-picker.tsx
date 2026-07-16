'use client';

/**
 * 批量"连结到某频道"的频道选择器（多选操作条里的入口）。
 * 复用 ChannelConnectButton 的搜索交互，选中频道后一次性批量提交。
 */
import { useEffect, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { batchConnectToChannel, type SelectedItem } from '@/app/actions/channel';
import { searchConnectableChannels } from '@/app/actions/search';

type Pick = { documentId: string; title: string; slug: string };

export function BatchConnectPicker({
  items,
  myChannels,
  excludeChannelId,
  onClose,
  onDone,
}: {
  items: SelectedItem[];
  myChannels: Pick[];
  /** 当前所在频道：从选项里排除，避免"连结到自己"这种空操作 */
  excludeChannelId: string;
  onClose: () => void;
  onDone: (result: { succeeded: number; failed: number }) => void;
}) {
  const t = useTranslations('Connect');
  const tc = useTranslations('Channel');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Pick[]>([]);
  const [searching, setSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (timer.current) clearTimeout(timer.current);
    if (!q) { setResults([]); setSearching(false); return; }
    setSearching(true);
    timer.current = setTimeout(async () => {
      setResults(await searchConnectableChannels(q));
      setSearching(false);
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  const showing = (query.trim() ? results : myChannels).filter((ch) => ch.documentId !== excludeChannelId);

  const pick = (targetId: string, targetSlug: string) => {
    startTransition(async () => {
      const result = await batchConnectToChannel(items, targetId, targetSlug);
      onDone(result);
    });
  };

  return (
    <div className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-[10px] uppercase tracking-widest text-neutral-300">{tc('connectTo')}</span>
        <button type="button" onClick={onClose} className="text-xs text-neutral-300 hover:text-neutral-600">✕</button>
      </div>
      <div className="px-2 pb-1.5">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholderPublic')}
          className="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400"
        />
      </div>
      <ul className="max-h-56 overflow-y-auto">
        {isPending && <li className="px-3 py-2 text-xs text-neutral-400">{t('batchConnecting')}</li>}
        {!isPending && searching && <li className="px-3 py-2 text-xs text-neutral-400">{t('searching')}</li>}
        {!isPending && !searching && showing.length === 0 && (
          <li className="px-3 py-2 text-xs text-neutral-400">
            {query.trim() ? t('noMatch') : t('noOptions')}
          </li>
        )}
        {!isPending &&
          showing.map((ch) => (
            <li key={ch.documentId}>
              <button
                type="button"
                onClick={() => pick(ch.documentId, ch.slug)}
                className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-neutral-50"
              >
                {ch.title}
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}
