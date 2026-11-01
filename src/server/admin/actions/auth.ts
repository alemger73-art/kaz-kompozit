'use server';
import { redirect } from 'next/navigation';
import { audit } from '@/server/audit';
import { signIn, signOut, getCurrentUser } from '@/server/auth/session';
import { allowRequest } from '@/server/rate-limit';
import { headers } from 'next/headers';
import { clientIp } from '@/server/rate-limit';

export type LoginState = { error?: string };

export async function loginAction(_state: LoginState, form: FormData): Promise<LoginState> {
  const ip = clientIp(await headers());
  if (!allowRequest(`login:${ip}`, 10, 15 * 60_000)) {
    return { error: 'Слишком много попыток. Подождите 15 минут.' };
  }
  const email = String(form.get('email') ?? '');
  const password = String(form.get('password') ?? '');
  const user = await signIn(email, password);
  if (!user) return { error: 'Неверный e-mail или пароль' };
  await audit(user.id, 'login', 'user', user.id, { ip });
  const next = String(form.get('next') ?? '');
  redirect(next.startsWith('/admin') ? next : '/admin');
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) await audit(user.id, 'logout', 'user', user.id);
  await signOut();
  redirect('/admin/login');
}
