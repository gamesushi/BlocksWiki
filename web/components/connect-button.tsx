'use client';

/**
 * Connect 按钮 + Channel 选择器（乐观更新）。
 * 两个来源：
 *  - myChannels：session 传入的"我拥有 + 我协作"的频道（快捷列表，含私密/closed）。
 *  - 搜索：防抖查任意公开频道 —— 兑现"任何人可连公开频道"的语义。
 */
import { useEffect, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { connectBlock } from '@/app/actions/connections';
import { searchConnectableChannels, type ConnectableChannel } from '@/app/actions/search';
import type { Channel } from '@/lib/types';

type ChannelPick = Pick<Channel, 'documentId' | 'title' | 'slug'> & { ownerName?: string };

export function ConnectButton({
  blockId,
  myChannels,
}: {
  blockId: string;
  myChannels: Pick<Channel, 'documentId' | 'title' | 'slug'>[];
}) {
  const t = useTranslations('Connect');
  const tc = useTranslations('Channel');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ConnectableChannel[]>([]);
  const [searching, setSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 防抖搜索公开频道
  useEffect(() => {
    const q = query.trim();
    if (timer.current) clearTimeout(timer.current);
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      const found = await searchConnectableChannels(q);
      setResults(found);
      setSearching(false);
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  const connect = (channelId: string) => {
    setConnectedIds((ids) => [...ids, channelId]);
    startTransition(async () => {
      const result = await connectBlock(blockId, channelId);
      if (!result.ok) {
        setConnectedIds((ids) => ids.filter((id) => id !== channelId));
        alert(result.error);
      }
    });
  };

  // 搜索态显示结果，否则显示我的频道
  const showing: ChannelPick[] = query.trim() ? results : myChannels;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-neutral-300 px-3 py-1 text-xs tracking-wide text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
      >
        {t('connect')} →
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-64 rounded-lg border border-neutral-200 bg-white py-1 shadow-sm">
          <div className="px-2 py-1.5">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400"
            />
          </div>

          {!query.trim() && (
            <p className="px-3 pb-1 pt-0.5 text-[10px] uppercase tracking-widest text-neutral-300">
              {tc('myChannels')}
            </p>
          )}

          <ul className="max-h-64 overflow-y-auto">
            {searching && <li className="px-3 py-2 text-xs text-neutral-400">{t('searching')}</li>}
            {!searching && showing.length === 0 && (
              <li className="px-3 py-2 text-xs text-neutral-400">
                {query.trim() ? t('noMatch') : t('createFirst')}
              </li>
            )}
            {showing.map((ch) => {
              const done = connectedIds.includes(ch.documentId);
              return (
                <li key={ch.documentId}>
                  <button
                    type="button"
                    disabled={done || isPending}
                    onClick={() => connect(ch.documentId)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-50"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {ch.title}
                      {ch.ownerName && (
                        <span className="ml-1 text-[11px] text-neutral-400">· {ch.ownerName}</span>
                      )}
                    </span>
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
