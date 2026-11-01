'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { purchasePrices, salePrices } from '@/db/schema';
import { audit } from '@/server/audit';
import { requireUser } from '@/server/auth/session';

const MONEY = /^\d{1,10}(\.\d{1,2})?$/;

function priceEntries(form: FormData, prefix: string) {
  return [...form.entries()]
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, value]) => ({ productId: key.slice(prefix.length), raw: String(value).trim().replace(',', '.').replace(/\s/g, '') }));
}

export async function savePurchasePrices(form: FormData) {
  const user = await requireUser('purchasePricesEdit');
  const entries = priceEntries(form, 'price_');
  if (entries.some((e) => e.raw && !MONEY.test(e.raw))) redirect('/admin/prices/purchase?error=Некорректная сумма');

  for (const { productId, raw } of entries) {
    if (!raw) continue;
    const supplierId = String(form.get(`supplier_${productId}`) ?? '') || null;
    await db.insert(purchasePrices).values({ productId, pricePerMeter: raw, supplierId })
      .onConflictDoUpdate({ target: purchasePrices.productId, set: { pricePerMeter: raw, supplierId, updatedAt: new Date() } });
  }
  // В журнал пишем факт изменения без самих сумм — журнал не должен становиться источником утечки.
  await audit(user.id, 'update', 'purchase_prices', null, { products: entries.filter((e) => e.raw).length });
  redirect('/admin/prices/purchase?ok=1');
}

export async function saveSalePrices(form: FormData) {
  const user = await requireUser('salePricesEdit');
  const tier = form.get('tier') === 'WHOLESALE' ? 'WHOLESALE' : 'RETAIL';
  const path = `/admin/prices/${tier === 'WHOLESALE' ? 'wholesale' : 'retail'}`;
  const entries = priceEntries(form, 'price_');
  if (entries.some((e) => e.raw && !MONEY.test(e.raw))) redirect(`${path}?error=Некорректная сумма`);

  for (const { productId, raw } of entries) {
    const approved = form.get(`approved_${productId}`) === 'on' && Boolean(raw);
    const demo = form.get(`demo_${productId}`) === 'on' && !approved;
    const values = { pricePerMeter: raw || null, approved, demo };
    await db.insert(salePrices).values({ productId, tier, ...values })
      .onConflictDoUpdate({ target: [salePrices.productId, salePrices.tier], set: { ...values, updatedAt: new Date() } });
  }
  await audit(user.id, 'update', 'sale_prices', null, { tier, products: entries.length });
  revalidatePath('/', 'layout');
  redirect(`${path}?ok=1`);
}
