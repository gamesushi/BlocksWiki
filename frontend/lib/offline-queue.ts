'use client';

/**
 * IndexedDB 离线采集队列 —— "地铁上 10 秒采集"的客户端一半。
 * 断网时 Block 先落本地库，恢复网络（online 事件 / 下次打开）后自动补发。
 * 不依赖 Service Worker Background Sync（iOS Safari 不支持），
 * 用页面级 flush 兜底：只要用户再次打开 PWA 就会同步。
 */
import type { EditorJsOutput } from './types';

const DB_NAME = 'blockwiki';
const STORE = 'pending-blocks';

export type PendingBlock = {
  id?: number;
  content: EditorJsOutput;
  blockType: 'text' | 'image' | 'link' | 'file';
  queuedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = run(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueBlock(item: Omit<PendingBlock, 'id'>): Promise<void> {
  const db = await openDb();
  await tx(db, 'readwrite', (s) => s.add(item));
  db.close();
}

export async function pendingCount(): Promise<number> {
  const db = await openDb();
  const count = await tx(db, 'readonly', (s) => s.count());
  db.close();
  return count;
}

/**
 * 逐条补发队列。sender 成功返回 true 则删除该条；
 * 一旦失败立即停止（保持 FIFO 顺序，等下一次 online 再试）。
 */
export async function flushQueue(
  sender: (item: PendingBlock) => Promise<boolean>
): Promise<{ sent: number; remaining: number }> {
  const db = await openDb();
  const items = await tx<PendingBlock[]>(db, 'readonly', (s) => s.getAll());

  let sent = 0;
  for (const item of items) {
    const ok = await sender(item).catch(() => false);
    if (!ok) break;
    await tx(db, 'readwrite', (s) => s.delete(item.id!));
    sent += 1;
  }

  const remaining = await tx(db, 'readonly', (s) => s.count());
  db.close();
  return { sent, remaining };
}
