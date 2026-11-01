/** Доступ к закупочным ценам — только серверный код CRM и админки. */
import 'server-only';
import { inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { purchasePrices } from '@/db/schema';

export async function getPurchasePriceMap(productIds: string[]): Promise<Map<string, string>> {
  if (productIds.length === 0) return new Map();
  const rows = await db.select({ productId: purchasePrices.productId, price: purchasePrices.pricePerMeter })
    .from(purchasePrices).where(inArray(purchasePrices.productId, productIds));
  return new Map(rows.map((r) => [r.productId, r.price]));
}
