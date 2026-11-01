'use server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/db/client';
import { products, type ProductSpec } from '@/db/schema';
import { audit } from '@/server/audit';
import { requireUser } from '@/server/auth/session';
import { saveUpload, UploadError } from '@/server/storage';
import { checkbox, firstError, formObject, optInt, optMoney, optStr, str } from '../form';

const productSchema = z.object({
  slug: str(120).regex(/^[a-z0-9-]+$/, 'только латиница, цифры и дефис'),
  categoryId: str(64).min(1),
  nameRu: str(200).min(1),
  nameKk: str(200).min(1),
  diameterMm: optMoney,
  descriptionRu: optStr(5000),
  descriptionKk: optStr(5000),
  specsText: optStr(5000),
  massPerMeterKg: optMoney,
  massVerified: checkbox,
  formatCoil: checkbox,
  formatBar: checkbox,
  coilLengthM: optInt,
  barLengthM: optMoney,
  minOrderM: optInt,
  availability: z.enum(['IN_STOCK', 'ON_ORDER', 'OUT_OF_STOCK']),
  stockM: optInt,
  leadTimeRu: optStr(200),
  leadTimeKk: optStr(200),
  applicationsRu: optStr(2000),
  applicationsKk: optStr(2000),
  published: checkbox,
  sort: optInt,
  seoTitle: optStr(200),
  seoDescription: optStr(400),
});

/** Строки «Лейбл RU | Лейбл KK | Значение | да» → характеристики. Последний столбец — «подтверждено». */
function parseSpecs(text: string | null): ProductSpec[] {
  if (!text) return [];
  return text.split('\n').map((line) => line.split('|').map((part) => part.trim())).filter((parts) => parts[0] && parts[2])
    .map(([labelRu, labelKk, value, verified]) => ({
      labelRu, labelKk: labelKk || labelRu, value, verified: /^(да|yes|\+|1|true)$/i.test(verified ?? ''),
    }));
}

export async function saveProduct(form: FormData) {
  const user = await requireUser('productsEdit');
  const id = String(form.get('id') ?? '');
  const parsed = productSchema.safeParse(formObject(form));
  const back = id ? `/admin/products/${id}` : '/admin/products/new';
  if (!parsed.success) redirect(`${back}?error=${encodeURIComponent(firstError(parsed.error))}`);
  const data = parsed.data;

  const existing = id ? await db.query.products.findFirst({ where: eq(products.id, id) }) : null;
  const removed = new Set(form.getAll('removeImage').map(String));
  const images = (existing?.images ?? []).filter((src) => !removed.has(src));
  try {
    for (const file of form.getAll('images')) {
      if (file instanceof File && file.size > 0) images.push(await saveUpload(file, 'public', 'image'));
    }
  } catch (error) {
    if (error instanceof UploadError) redirect(`${back}?error=${encodeURIComponent(error.message)}`);
    throw error;
  }

  const values = {
    slug: data.slug, categoryId: data.categoryId, nameRu: data.nameRu, nameKk: data.nameKk,
    diameterMm: data.diameterMm, descriptionRu: data.descriptionRu, descriptionKk: data.descriptionKk,
    specs: parseSpecs(data.specsText), massPerMeterKg: data.massPerMeterKg, massVerified: data.massVerified,
    supplyFormats: [data.formatCoil && 'COIL', data.formatBar && 'BAR'].filter((f): f is string => Boolean(f)),
    coilLengthM: data.coilLengthM, barLengthM: data.barLengthM, minOrderM: data.minOrderM,
    availability: data.availability, stockM: data.stockM, leadTimeRu: data.leadTimeRu, leadTimeKk: data.leadTimeKk,
    applicationsRu: data.applicationsRu, applicationsKk: data.applicationsKk, published: data.published,
    sort: data.sort ?? 0, seoTitle: data.seoTitle, seoDescription: data.seoDescription, images,
  };

  let productId = id;
  try {
    if (existing) {
      await db.update(products).set(values).where(eq(products.id, id));
    } else {
      const [created] = await db.insert(products).values(values).returning({ id: products.id });
      productId = created.id;
    }
  } catch (error) {
    const duplicate = String(error).includes('products_slug_unique');
    redirect(`${back}?error=${encodeURIComponent(duplicate ? 'Такой адрес (slug) уже занят' : 'Не удалось сохранить товар')}`);
  }

  await audit(user.id, existing ? 'update' : 'create', 'product', productId, { slug: data.slug });
  revalidatePath('/', 'layout');
  redirect(`/admin/products/${productId}?ok=1`);
}

export async function toggleProductPublished(form: FormData) {
  const user = await requireUser('productsEdit');
  const id = String(form.get('id'));
  const product = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!product) return;
  await db.update(products).set({ published: !product.published }).where(eq(products.id, id));
  await audit(user.id, product.published ? 'unpublish' : 'publish', 'product', id);
  revalidatePath('/', 'layout');
}
