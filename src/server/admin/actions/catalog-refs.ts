'use server';
/** Справочники: скидки, промокоды, поставщики, города доставки, логистические партнёры. */
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/db/client';
import { deliveryCities, discountRules, logisticsPartners, promoCodes, suppliers } from '@/db/schema';
import { audit } from '@/server/audit';
import { requireUser } from '@/server/auth/session';
import { checkbox, firstError, formObject, optInt, optMoney, optStr, str } from '../form';

const percent = z.string().trim().transform((v) => v.replace(',', '.')).refine((v) => /^\d{1,2}(\.\d{1,2})?$/.test(v), 'Процент от 0 до 99');

function fail(path: string, error: z.ZodError): never {
  redirect(`${path}?error=${encodeURIComponent(firstError(error))}`);
}

// ───── Скидки ─────
const discountSchema = z.object({ name: str(120).min(1), minMeters: optInt, percent, wholesaleOnly: checkbox, active: checkbox });

export async function saveDiscount(form: FormData) {
  const user = await requireUser('discounts');
  const id = String(form.get('id') ?? '');
  const parsed = discountSchema.safeParse(formObject(form));
  if (!parsed.success) fail('/admin/discounts', parsed.error);
  const values = { ...parsed.data, minMeters: parsed.data.minMeters ?? 0 };
  if (form.get('intent') === 'delete' && id) {
    await db.delete(discountRules).where(eq(discountRules.id, id));
  } else if (id) {
    await db.update(discountRules).set(values).where(eq(discountRules.id, id));
  } else {
    await db.insert(discountRules).values(values);
  }
  await audit(user.id, form.get('intent') === 'delete' ? 'delete' : 'save', 'discount_rule', id || null, values);
  revalidatePath('/', 'layout');
  redirect('/admin/discounts?ok=1');
}

const promoSchema = z.object({
  code: str(40).min(3).transform((v) => v.toUpperCase()).refine((v) => /^[A-Z0-9_-]+$/.test(v), 'Только латиница и цифры'),
  percent,
  maxUses: optInt,
  expiresAt: optStr(20),
  active: checkbox,
});

export async function savePromo(form: FormData) {
  const user = await requireUser('discounts');
  const id = String(form.get('id') ?? '');
  if (form.get('intent') === 'delete' && id) {
    await db.delete(promoCodes).where(eq(promoCodes.id, id));
    await audit(user.id, 'delete', 'promo_code', id);
    redirect('/admin/discounts?ok=1');
  }
  const parsed = promoSchema.safeParse(formObject(form));
  if (!parsed.success) fail('/admin/discounts', parsed.error);
  const values = { ...parsed.data, expiresAt: parsed.data.expiresAt ? new Date(`${parsed.data.expiresAt}T23:59:59+05:00`) : null };
  try {
    if (id) await db.update(promoCodes).set(values).where(eq(promoCodes.id, id));
    else await db.insert(promoCodes).values(values);
  } catch {
    redirect('/admin/discounts?error=Такой промокод уже существует');
  }
  await audit(user.id, 'save', 'promo_code', id || null, { code: values.code });
  redirect('/admin/discounts?ok=1');
}

// ───── Поставщики ─────
const supplierSchema = z.object({
  name: str(200).min(1), contactName: optStr(120), phone: optStr(40), email: optStr(160), city: optStr(120),
  verified: checkbox, notes: optStr(3000), priceListUpdatedAt: optStr(20),
});

export async function saveSupplier(form: FormData) {
  const user = await requireUser('suppliers');
  const id = String(form.get('id') ?? '');
  const parsed = supplierSchema.safeParse(formObject(form));
  if (!parsed.success) fail('/admin/suppliers', parsed.error);
  const values = { ...parsed.data, priceListUpdatedAt: parsed.data.priceListUpdatedAt ? new Date(parsed.data.priceListUpdatedAt) : null };
  if (id) await db.update(suppliers).set(values).where(eq(suppliers.id, id));
  else await db.insert(suppliers).values(values);
  await audit(user.id, 'save', 'supplier', id || null, { name: values.name });
  redirect('/admin/suppliers?ok=1');
}

// ───── Логистика ─────
const citySchema = z.object({
  nameRu: str(120).min(1), nameKk: str(120).min(1), slug: str(64).regex(/^[a-z0-9-]+$/), regionRu: optStr(200),
  distanceKm: optInt, tariff: optMoney, tariffConfirmed: checkbox, leadTimeRu: optStr(200),
  mapX: optInt, mapY: optInt, sort: optInt, active: checkbox,
});

export async function saveCity(form: FormData) {
  const user = await requireUser('logistics');
  const id = String(form.get('id') ?? '');
  const parsed = citySchema.safeParse(formObject(form));
  if (!parsed.success) fail('/admin/logistics', parsed.error);
  const data = parsed.data;
  // Тариф без суммы не может быть «подтверждённым».
  const values = { ...data, sort: data.sort ?? 0, tariffConfirmed: data.tariffConfirmed && Boolean(data.tariff) };
  try {
    if (id) await db.update(deliveryCities).set(values).where(eq(deliveryCities.id, id));
    else await db.insert(deliveryCities).values(values);
  } catch {
    redirect('/admin/logistics?error=Город с таким кодом уже есть');
  }
  await audit(user.id, 'save', 'delivery_city', id || null, { slug: values.slug, tariffConfirmed: values.tariffConfirmed });
  revalidatePath('/', 'layout');
  redirect('/admin/logistics?ok=1');
}

const partnerSchema = z.object({ name: str(200).min(1), phone: optStr(40), notes: optStr(2000), verified: checkbox, published: checkbox });

export async function savePartner(form: FormData) {
  const user = await requireUser('logistics');
  const id = String(form.get('id') ?? '');
  const parsed = partnerSchema.safeParse(formObject(form));
  if (!parsed.success) fail('/admin/logistics', parsed.error);
  // Публиковать можно только проверенного партнёра.
  const values = { ...parsed.data, published: parsed.data.published && parsed.data.verified };
  if (id) await db.update(logisticsPartners).set(values).where(eq(logisticsPartners.id, id));
  else await db.insert(logisticsPartners).values(values);
  await audit(user.id, 'save', 'logistics_partner', id || null, { name: values.name });
  revalidatePath('/', 'layout');
  redirect('/admin/logistics?ok=1');
}
