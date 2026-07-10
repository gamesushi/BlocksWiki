'use server';

/**
 * Connect 动作 —— Are.na 的灵魂：
 * 用户 B 看到用户 A 的 Block，选一个自己的 Channel，点 Connect。
 * 后端只新增一条 Connection 边；Block 本体零复制、零修改，
 * 下一次该 Channel 页渲染（revalidateTag 精确失效）即“瞬间挂载”。
 */
import { updateTag } from 'next/cache';
import { strapiFetch, StrapiError, type StrapiResponse } from '@/lib/strapi';
import type { Connection } from '@/lib/types';

export type ConnectResult =
  | { ok: true; connection: Connection; duplicated: boolean }
  | { ok: false; error: string };

export async function connectBlock(
  blockId: string,
  channelId: string
): Promise<ConnectResult> {
  try {
    const res = await strapiFetch<
      StrapiResponse<Connection> & { meta?: { duplicated?: boolean } }
    >('/connections/connect', {
      method: 'POST',
      body: { blockId, channelId },
    });

    // updateTag（Next 16）读己之写：connect 后跳转频道页必须立刻看到刚挂载的 Block
    const slug = res.data.channel?.slug;
    if (slug) updateTag(`channel:${slug}`);
    updateTag(`block:${blockId}`); // Block 详情页的 "connected to N channels" 侧栏

    return { ok: true, connection: res.data, duplicated: !!res.meta?.duplicated };
  } catch (err) {
    if (err instanceof StrapiError) {
      if (err.status === 401) return { ok: false, error: '请先登录。' };
      if (err.status === 403) return { ok: false, error: '只能连结到自己的 Channel。' };
      if (err.status === 409) return { ok: false, error: '已经连结过了。' };
    }
    return { ok: false, error: '连结失败，请重试。' };
  }
}

export async function disconnectBlock(
  connectionId: string,
  channelSlug: string
): Promise<{ ok: boolean }> {
  try {
    await strapiFetch('/connections/disconnect', {
      method: 'POST', // Strapi 不解析 DELETE 请求体
      body: { connectionId },
    });
    updateTag(`channel:${channelSlug}`);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
