import 'server-only';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { db } from '@/db/client';
import { users, type Role } from '@/db/schema';
import { createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS, verifySessionToken } from './token';

/** Хэш-заглушка для выравнивания времени ответа при неверном логине. */
const DUMMY_HASH = '$2b$12$dEjNnxgvBsojxUY6KMmA1.wHDUU8olK1lInJEN9QbTdorgKoJ5D2a';

export type CurrentUser = { id: string; name: string; email: string; role: Role };

/** Матрица доступа: какие роли могут работать с разделом. */
export const permissions = {
  dashboard: ['ADMIN', 'MANAGER', 'CONTENT'],
  products: ['ADMIN', 'MANAGER', 'CONTENT'],
  productsEdit: ['ADMIN', 'CONTENT'],
  purchasePricesView: ['ADMIN', 'MANAGER'],
  purchasePricesEdit: ['ADMIN'],
  salePricesEdit: ['ADMIN'],
  discounts: ['ADMIN'],
  suppliers: ['ADMIN', 'MANAGER'],
  crm: ['ADMIN', 'MANAGER'],
  quotesApprove: ['ADMIN', 'MANAGER'],
  logistics: ['ADMIN', 'MANAGER'],
  content: ['ADMIN', 'CONTENT'],
  seo: ['ADMIN', 'CONTENT'],
  stats: ['ADMIN', 'MANAGER'],
  settings: ['ADMIN'],
  users: ['ADMIN'],
  audit: ['ADMIN'],
  integrations: ['ADMIN', 'MANAGER'],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof permissions;

export function can(user: Pick<CurrentUser, 'role'>, permission: Permission): boolean {
  return (permissions[permission] as readonly Role[]).includes(user.role);
}

/** Текущий пользователь админки (с проверкой, что учётная запись активна). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const session = await verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, session.sub) });
  if (!user || !user.active) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
});

/** Для страниц и серверных действий: без доступа — переход на вход или на главную админки. */
export async function requireUser(permission?: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/admin/login');
  if (permission && !can(user, permission)) redirect('/admin?denied=1');
  return user;
}

export async function signIn(email: string, password: string): Promise<CurrentUser | null> {
  const user = await db.query.users.findFirst({ where: eq(users.email, email.trim().toLowerCase()) });
  // Сравнение выполняется всегда, чтобы время ответа не выдавало существование логина.
  const hash = user?.passwordHash ?? DUMMY_HASH;
  const valid = await bcrypt.compare(password, hash);
  if (!user || !user.active || !valid) return null;

  const token = await createSessionToken({ sub: user.id, role: user.role, name: user.name });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function signOut() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
