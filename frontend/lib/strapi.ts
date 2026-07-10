/**
 * Strapi v5 极简客户端（服务端组件 / Server Actions 共用）。
 * 认证：users-permissions JWT 存 httpOnly cookie（登录时由 /api/auth/local 写入）。
 */
import { cookies } from 'next/headers';

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';

export type StrapiDoc<T> = T & {
  id: number;
  documentId: string;
  createdAt: string;
  updatedAt: string;
};

export type StrapiResponse<T> = {
  data: T;
  meta?: { pagination?: { page: number; pageSize: number; total: number } };
};

type FetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Next.js 缓存标签，配合 revalidateTag 做精确失效 */
  tags?: string[];
  revalidate?: number;
};

export async function strapiFetch<T>(
  path: string,
  { method = 'GET', body, tags, revalidate }: FetchOptions = {}
): Promise<T> {
  const jwt = (await cookies()).get('jwt')?.value;

  const doFetch = (token?: string) =>
    fetch(`${STRAPI_URL}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      next: {
        ...(tags ? { tags } : {}),
        ...(revalidate !== undefined ? { revalidate } : {}),
      },
      // 写操作永不缓存
      ...(method !== 'GET' ? { cache: 'no-store' as const } : {}),
    });

  let res = await doFetch(jwt);

  // cookie 里的 JWT 过期/失效时，公共读优雅降级为匿名，
  // 否则一个坏 cookie 会让访客看到整站 500
  if (res.status === 401 && jwt && method === 'GET') {
    res = await doFetch(undefined);
  }

  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new StrapiError(
      detail?.error?.message ?? `Strapi ${method} ${path} failed (${res.status})`,
      res.status
    );
  }
  return res.json();
}

export class StrapiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'StrapiError';
  }
}
