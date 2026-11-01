'use client';
import { useActionState } from 'react';
import { loginAction, type LoginState } from '@/server/admin/actions/auth';

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ''} />
      <label className="block">
        <span className="field-label">E-mail</span>
        <input name="email" type="email" required autoComplete="username" className="field" />
      </label>
      <label className="block">
        <span className="field-label">Пароль</span>
        <input name="password" type="password" required autoComplete="current-password" className="field" />
      </label>
      {state.error && <p className="text-sm font-semibold text-red-600" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">{pending ? 'Вход…' : 'Войти'}</button>
    </form>
  );
}
