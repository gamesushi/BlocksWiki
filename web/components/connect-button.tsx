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
        className="btn btn-outline btn-xs gap-0.5 rounded-full border-base-300 font-normal text-base-content/60 transition-all hover:border-primary/50 hover:text-primary hover:shadow-sm"
      >
        {t('connect')}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </button>

      {open && (
        <div className="dropdown-content card compact z-20 mt-2 w-72 border border-base-300 bg-base-100 shadow-lg">
          <div className="card-body p-4 pb-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="input input-bordered input-sm w-full bg-base-200 focus:border-primary/50"
              autoFocus
            />
          </div>

          {!query.trim() && (
            <div className="-mt-1 px-4 pb-1 pt-0">
              <span className="text-[10px] font-medium uppercase tracking-widest text-base-content/30">
                {tc('myChannels')}
              </span>
            </div>
          )}

          <ul className="menu menu-sm max-h-64 overflow-y-auto rounded-box px-2 py-1">
            {searching && (
              <li><a className="pointer-events-none text-base-content/40">{t('searching')}</a></li>
            )}
            {!searching && showing.length === 0 && (
              <li><a className="pointer-events-none text-base-content/40">
                {query.trim() ? t('noMatch') : t('createFirst')}
              </a></li>
            )}
            {showing.map((ch) => {
              const done = connectedIds.includes(ch.documentId);
              return (
                <li key={ch.documentId}>
                  <button
                    type="button"
                    disabled={done || isPending}
                    onClick={() => connect(ch.documentId)}
                    className="flex items-center justify-between disabled:!opacity-50"
                  >
                    <span className="min-w-0 truncate">
                      {ch.title}
                      {ch.ownerName && (
                        <span className="ml-1 text-[11px] text-base-content/35">· {ch.ownerName}</span>
                      )}
                    </span>
                    {done && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-success" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
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
