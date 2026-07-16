'use client';

import { Suspense, useActionState, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
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

  const t = useTranslations('Form');
  const tn = useTranslations('Nav');
  const tc = useTranslations('Common');

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-xl font-medium tracking-tight">BlocksWiki</h1>
      <p className="mb-8 text-sm text-neutral-400">{tc('tagline')}</p>

      <div className="mb-6 flex gap-4 text-sm">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={mode === 'login' ? 'font-medium text-neutral-900' : 'text-neutral-400'}
        >
          {tn('login')}
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={mode === 'register' ? 'font-medium text-neutral-900' : 'text-neutral-400'}
        >
          {tn('signup')}
        </button>
      </div>

      {mode === 'login' ? (
        <form action={loginAction} className="flex flex-col gap-3">
          <input
            name="identifier"
            placeholder={t('identifier')}
            autoComplete="username"
            className={inputCls}
          />
          <input
            name="password"
            type="password"
            placeholder={t('password')}
            autoComplete="current-password"
            className={inputCls}
          />
          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-full bg-neutral-900 py-2.5 text-sm text-white disabled:opacity-40"
          >
            {pending ? t('signingIn') : tn('login')}
          </button>
        </form>
      ) : (
        <form action={registerAction} className="flex flex-col gap-3">
          <input name="username" placeholder={t('username')} autoComplete="username" className={inputCls} />
          <input name="email" type="email" placeholder={t('email')} autoComplete="email" className={inputCls} />
          <input
            name="password"
            type="password"
            placeholder={t('passwordHint')}
            autoComplete="new-password"
            className={inputCls}
          />
          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-full bg-neutral-900 py-2.5 text-sm text-white disabled:opacity-40"
          >
            {pending ? t('signingUp') : tn('signup')}
          </button>
        </form>
      )}

      <p className="mt-3 min-h-5 text-sm text-red-500">{error}</p>
    </main>
  );
}

export default function LoginPage() {
  const t = useTranslations('Common');
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-dvh max-w-sm items-center justify-center px-6 text-sm text-neutral-400">
          {t('loading')}
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
