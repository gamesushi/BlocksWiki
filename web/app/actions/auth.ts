'use server';

/**
 * 认证：users-permissions 的 JWT 存 httpOnly cookie，前端 JS 永远接触不到 token。
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { UserSummary } from '@/lib/types';

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';

export type AuthState = { error: string } | null;

async function setJwtCookie(jwt: string) {
  (await cookies()).set('jwt', jwt, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const t = await getTranslations('Errors');
  const identifier = String(formData.get('identifier') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!identifier || !password) return { error: t('loginRequiredFields') };

  let payload: any;
  try {
    const res = await fetch(`${STRAPI_URL}/api/auth/local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
      cache: 'no-store',
    });
    payload = await res.json();
    if (!res.ok) return { error: payload?.error?.message ?? t('loginFailed') };
  } catch {
    return { error: t('serverUnreachable') };
  }

  await setJwtCookie(payload.jwt);
  redirect('/');
}

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const t = await getTranslations('Errors');
  const username = String(formData.get('username') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!username || !email || !password) return { error: t('registerRequiredFields') };

  let payload: any;
  try {
    const res = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
      cache: 'no-store',
    });
    payload = await res.json();
    if (!res.ok) return { error: payload?.error?.message ?? t('registerFailed') };
  } catch {
    return { error: t('serverUnreachable') };
  }

  await setJwtCookie(payload.jwt);
  redirect('/');
}

export async function logout() {
  (await cookies()).delete('jwt');
  redirect('/login');
}

export async function getMe(): Promise<UserSummary | null> {
  const jwt = (await cookies()).get('jwt')?.value;
  if (!jwt) return null;
  try {
    const res = await fetch(`${STRAPI_URL}/api/users/me?fields[0]=username`, {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export type ChannelSummary = { documentId: string; title: string; slug: string };
export type Session = {
  me: UserSummary;
  channels: ChannelSummary[];
  /** 我关注的用户名（followingNames 反规范化） */
  following: string[];
  /** 我关注的频道 documentId */
  followedChannelIds: string[];
};

/**
 * 当前用户 + 可连结的 Channel 列表（自己拥有的 + 作为协作者的）。
 * users-permissions 禁止 `filters[owner][id]` 这类对 user 关系的过滤，
 * 故从 /users/me 反向 populate 两个关系再合并去重。
 */
export async function getSession(): Promise<Session | null> {
  const jwt = (await cookies()).get('jwt')?.value;
  if (!jwt) return null;
  try {
    const qs =
      'fields[0]=username' +
      '&fields[1]=isAdmin' +
      '&fields[2]=followingNames' +
      '&populate[channels][fields][0]=title' +
      '&populate[channels][fields][1]=slug' +
      '&populate[channels][sort][0]=createdAt:desc' +
      '&populate[collaboratingChannels][fields][0]=title' +
      '&populate[collaboratingChannels][fields][1]=slug' +
      '&populate[collaboratingChannels][sort][0]=createdAt:desc' +
      '&populate[followedChannels][fields][0]=documentId';
    const res = await fetch(`${STRAPI_URL}/api/users/me?${qs}`, {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const me = await res.json();

    const seen = new Set<string>();
    const channels: ChannelSummary[] = [];
    for (const ch of [...(me.channels ?? []), ...(me.collaboratingChannels ?? [])]) {
      if (!ch?.documentId || seen.has(ch.documentId)) continue;
      seen.add(ch.documentId);
      channels.push({ documentId: ch.documentId, title: ch.title, slug: ch.slug });
    }

    return {
      me: { id: me.id, username: me.username, isAdmin: !!me.isAdmin },
      channels,
      following: Array.isArray(me.followingNames) ? me.followingNames : [],
      followedChannelIds: (me.followedChannels ?? []).map((c: any) => c.documentId),
    };
  } catch {
    return null;
  }
}
