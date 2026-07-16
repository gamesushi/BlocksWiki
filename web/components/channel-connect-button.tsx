'use client';

/**
 * 把「当前频道」作为频道块连入另一个频道（Are.na 的 "Connect →"）。
 * 搜索可连入的公开频道 + 快捷列出我的频道；选中即连结。
 */
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { connectChannelToChannel } from '@/app/actions/channel';
import { searchConnectableChannels } from '@/app/actions/search';

type Pick = { documentId: string; title: string; slug: string };

export function ChannelConnectButton({
  channelId,
  myChannels,
}: {
  channelId: string;
  myChannels: Pick[];
}) {
  const t = useTranslations('Connect');
  const tc = useTranslations('Channel');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Pick[]>([]);
  const [searching, setSearching] = useState(false);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

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

  const connect = (targetId: string, targetSlug: string) => {
    if (targetId === channelId) return;
    setConnectedIds((ids) => [...ids, targetId]);
    startTransition(async () => {
      const res = await connectChannelToChannel(channelId, targetId, targetSlug);
      if (!res.ok) {
        setConnectedIds((ids) => ids.filter((id) => id !== targetId));
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  };

  const showing: Pick[] = query.trim() ? results : myChannels;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
      >
        {t('connect')} →
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-64 rounded-lg border border-neutral-200 bg-white py-1 shadow-sm">
          <div className="px-2 py-1.5">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('placeholder')}
              className="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400"
            />
          </div>
          {!query.trim() && (
            <p className="px-3 pb-1 text-[10px] uppercase tracking-widest text-neutral-300">{tc('myChannels')}</p>
          )}
          <ul className="max-h-64 overflow-y-auto">
            {searching && <li className="px-3 py-2 text-xs text-neutral-400">{t('searching')}</li>}
            {!searching && showing.length === 0 && (
              <li className="px-3 py-2 text-xs text-neutral-400">
                {query.trim() ? t('noMatch') : t('noOptions')}
              </li>
            )}
            {showing
              .filter((ch) => ch.documentId !== channelId)
              .map((ch) => {
                const done = connectedIds.includes(ch.documentId);
                return (
                  <li key={ch.documentId}>
                    <button
                      type="button"
                      disabled={done || isPending}
                      onClick={() => connect(ch.documentId, ch.slug)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-50"
                    >
                      <span className="min-w-0 flex-1 truncate">{ch.title}</span>
                      {done && <span className="ml-2 shrink-0 text-xs text-emerald-600">✓</span>}
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </div>
  );
}
