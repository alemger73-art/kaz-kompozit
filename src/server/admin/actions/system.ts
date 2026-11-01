'use server';
/** Системные разделы: настройки компании и пользователи. */
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/db/client';
import { companySettings, users } from '@/db/schema';
import { audit } from '@/server/audit';
import { hashPassword, requireUser } from '@/server/auth/session';
import { checkbox, firstError, formObject, optInt, optStr, str } from '../form';

const settingsSchema = z.object({
  companyName: str(120).min(1), legalName: optStr(200), phone: optStr(40), whatsapp: optStr(40), email: optStr(160),
  cityRu: str(120).min(1), cityKk: str(120).min(1), address: optStr(300), addressConfirmed: checkbox,
  mapEmbedUrl: optStr(1000), workHours: optStr(120), instagram: optStr(200), telegram: optStr(200),
  aboutRu: optStr(5000), aboutKk: optStr(5000), quoteTerms: optStr(3000), quoteValidDays: optInt,
});

export async function saveSettings(form: FormData) {
  const user = await requireUser('settings');
  const parsed = settingsSchema.safeParse(formObject(form));
  if (!parsed.success) redirect(`/admin/settings?error=${encodeURIComponent(firstError(parsed.error))}`);
  const values = { ...parsed.data, quoteValidDays: parsed.data.quoteValidDays || 7 };
  await db.insert(companySettings).values({ id: 1, ...values }).onConflictDoUpdate({ target: companySettings.id, set: values });
  await audit(user.id, 'update', 'settings', '1');
  revalidatePath('/', 'layout');
  redirect('/admin/settings?ok=1');
}

const userSchema = z.object({
  name: str(120).min(1),
  email: str(160).email().transform((v) => v.toLowerCase()),
  role: z.enum(['ADMIN', 'MANAGER', 'CONTENT']),
  active: checkbox,
  password: z.string().max(200).optional().transform((v) => v || null)
    .refine((v) => v === null || v.length >= 10, 'Пароль — не короче 10 символов'),
});

export async function saveUser(form: FormData) {
  const admin = await requireUser('users');
  const id = String(form.get('id') ?? '');
  const parsed = userSchema.safeParse(formObject(form));
  if (!parsed.success) redirect(`/admin/users?error=${encodeURIComponent(firstError(parsed.error))}`);
  const { password, ...data } = parsed.data;

  // Нельзя лишить себя прав администратора или отключить свою учётную запись.
  if (id === admin.id && (data.role !== 'ADMIN' || !data.active)) {
    redirect('/admin/users?error=Нельзя понизить роль или отключить собственную учётную запись');
  }
  try {
    if (id) {
      await db.update(users).set({ ...data, ...(password && { passwordHash: await hashPassword(password) }) }).where(eq(users.id, id));
    } else {
      if (!password) redirect('/admin/users?error=Для нового пользователя задайте пароль');
      await db.insert(users).values({ ...data, passwordHash: await hashPassword(password) });
    }
  } catch {
    redirect('/admin/users?error=Пользователь с таким e-mail уже существует');
  }
  await audit(admin.id, id ? 'update' : 'create', 'user', id || null, { email: data.email, role: data.role, active: data.active, passwordChanged: Boolean(password) });
  redirect('/admin/users?ok=1');
}
