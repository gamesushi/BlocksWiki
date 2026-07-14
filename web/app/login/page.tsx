'use client';

import { Suspense, useActionState, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { login, register, type AuthState } from '@/app/actions/auth';

function LoginForm() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loginState, loginAction, loginPending] = useActionState<AuthState, FormData>(login, null);
  const [registerState, registerAction, registerPending] = useActionState<AuthState, FormData>(
    register,
    null
  );

  const error = mode === 'login' ? loginState?.error : registerState?.error;
  const pending = mode === 'login' ? loginPending : registerPending;

  const inputCls =
    'w-full rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-neutral-400';

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-xl font-medium tracking-tight">BlocksWiki</h1>
      <p className="mb-8 text-sm text-neutral-400">基于 Block 的生活 Wiki</p>

      <div className="mb-6 flex gap-4 text-sm">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={mode === 'login' ? 'font-medium text-neutral-900' : 'text-neutral-400'}
        >
          登录
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={mode === 'register' ? 'font-medium text-neutral-900' : 'text-neutral-400'}
        >
          注册
        </button>
      </div>

      {mode === 'login' ? (
        <form action={loginAction} className="flex flex-col gap-3">
          <input
            name="identifier"
            placeholder="用户名或邮箱"
            autoComplete="username"
            className={inputCls}
          />
          <input
            name="password"
            type="password"
            placeholder="密码"
            autoComplete="current-password"
            className={inputCls}
          />
          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-full bg-neutral-900 py-2.5 text-sm text-white disabled:opacity-40"
          >
            {pending ? '登录中…' : '登录'}
          </button>
        </form>
      ) : (
        <form action={registerAction} className="flex flex-col gap-3">
          <input name="username" placeholder="用户名" autoComplete="username" className={inputCls} />
          <input name="email" type="email" placeholder="邮箱" autoComplete="email" className={inputCls} />
          <input
            name="password"
            type="password"
            placeholder="密码（至少 6 位）"
            autoComplete="new-password"
            className={inputCls}
          />
          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-full bg-neutral-900 py-2.5 text-sm text-white disabled:opacity-40"
          >
            {pending ? '注册中…' : '注册'}
          </button>
        </form>
      )}

      <p className="mt-3 min-h-5 text-sm text-red-500">{error}</p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-dvh max-w-sm items-center justify-center px-6 text-sm text-neutral-400">
          加载中…
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
