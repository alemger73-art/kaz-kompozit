/** Создание черновика КП — общая логика для менеджера и агента по КП. */
import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { companySettings, dealEvents, dealItems, deals, products, quotes, type QuoteLine } from '@/db/schema';
import { dec, roundMoney } from '@/lib/money';

export type DraftQuoteInput = {
  dealId: string;
  userId: string | null;
  discount?: string | null;
  includeDelivery?: boolean;
  terms?: string | null;
  /** Кто подготовил: менеджер или агент */
  author?: string;
};

export type DraftQuoteResult = { ok: true; id: string; number: number } | { ok: false; error: string };

export async function createDraftQuote(input: DraftQuoteInput): Promise<DraftQuoteResult> {
  const deal = await db.query.deals.findFirst({ where: eq(deals.id, input.dealId) });
  if (!deal) return { ok: false, error: 'Сделка не найдена' };

  const items = await db.select({ productId: dealItems.productId, meters: dealItems.meters, salePrice: dealItems.salePrice, name: products.nameRu })
    .from(dealItems).innerJoin(products, eq(products.id, dealItems.productId)).where(eq(dealItems.dealId, input.dealId));
  if (items.length === 0 || items.some((i) => !i.salePrice)) {
    return { ok: false, error: 'Для КП у всех позиций должна быть цена продажи' };
  }

  const discountRaw = input.discount?.replace(',', '.').trim() ?? '';
  if (discountRaw && !/^\d{1,10}(\.\d{1,2})?$/.test(discountRaw)) return { ok: false, error: 'Некорректная скидка' };

  const lines: QuoteLine[] = items.map((i) => ({
    productId: i.productId, name: i.name, meters: i.meters, pricePerMeter: i.salePrice!,
    amount: roundMoney(dec(i.meters).mul(i.salePrice!)).toFixed(2),
  }));
  const goods = lines.reduce((sum, l) => sum.plus(l.amount), dec(0));
  const discount = discountRaw ? dec(discountRaw) : dec(0);
  if (discount.gt(goods)) return { ok: false, error: 'Скидка больше суммы товара' };
  const includeDelivery = Boolean(input.includeDelivery) && deal.deliveryCost !== null;
  const total = goods.minus(discount).plus(includeDelivery ? dec(deal.deliveryCost) : 0);

  const [settings] = await db.select().from(companySettings).where(eq(companySettings.id, 1));
  const validDays = settings?.quoteValidDays ?? 7;
  const [quote] = await db.insert(quotes).values({
    dealId: input.dealId, lines, total: total.toFixed(2),
    discount: discount.isZero() ? null : discount.toFixed(2),
    deliveryCost: includeDelivery ? deal.deliveryCost : null,
    terms: input.terms?.trim() || settings?.quoteTerms || null,
    validUntil: new Date(Date.now() + validDays * 24 * 3600 * 1000),
    createdById: input.userId,
  }).returning({ id: quotes.id, number: quotes.number });

  await db.update(deals).set({ status: 'QUOTE_READY' })
    .where(and(eq(deals.id, input.dealId), inArray(deals.status, ['NEW', 'CLARIFYING', 'SUPPLIER_PRICE', 'DELIVERY_CALC'])));
  await db.insert(dealEvents).values({
    dealId: input.dealId, userId: input.userId, type: 'SYSTEM',
    text: `Подготовлен черновик КП №${quote.number}${input.author ? ` (${input.author})` : ''}. Требует утверждения.`,
  });
  return { ok: true, id: quote.id, number: quote.number };
}
