/**
 * Создание заявки: клиент → заявка → сделка CRM.
 * Стоимость всегда пересчитывается на сервере; данные клиента не принимаются на веру.
 */
import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { customers, dealEvents, dealItems, deals, leads, type BuyerType, type LeadSource } from '@/db/schema';
import { calculate } from '@/lib/calculator';
import { SOURCE_LABELS } from '@/lib/crm';
import { pick, type Locale } from '@/lib/i18n';
import { computeMargin } from '@/lib/margin';
import { dec, formatTenge } from '@/lib/money';
import { normalizePhone } from '@/lib/phone';
import { getPurchasePriceMap } from './admin/purchase-prices';
import { notifyManagers } from './notify';
import { findValidPromo, registerPromoUse } from './promo';
import {
  getDeliveryCities, getDiscountRules, getPublicProducts, toCalcCity, toCalcProduct,
} from './public/catalog';
import type { SpecLine } from './spec-parser';

export type LeadItemInput = { productId: string; meters?: string | number; coils?: number; bars?: number };

export type CreateLeadInput = {
  source: LeadSource;
  name: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  bin?: string | null;
  city?: string | null;
  message?: string | null;
  buyerType: BuyerType;
  locale: Locale;
  items?: LeadItemInput[];
  citySlug?: string | null;
  promoCode?: string | null;
  attachments?: string[];
  specLines?: SpecLine[];
};


type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function upsertCustomer(tx: Tx, input: CreateLeadInput, cityName: string | null) {
  const phone = normalizePhone(input.phone);
  const existing = await tx.query.customers.findFirst({ where: eq(customers.phone, phone) });
  if (existing) {
    await tx.update(customers).set({
      email: existing.email ?? input.email ?? null,
      company: existing.company ?? input.company ?? null,
      bin: existing.bin ?? input.bin ?? null,
      city: existing.city ?? cityName,
      type: input.buyerType === 'WHOLESALE' ? 'WHOLESALE' : existing.type,
    }).where(eq(customers.id, existing.id));
    return existing.id;
  }
  const [created] = await tx.insert(customers).values({
    name: input.name, phone, email: input.email ?? null, company: input.company ?? null,
    bin: input.bin ?? null, city: cityName, type: input.buyerType,
  }).returning({ id: customers.id });
  return created.id;
}

/** Позиции спецификации сопоставляются с каталогом по диаметру. */
function specToItems(lines: SpecLine[], products: Awaited<ReturnType<typeof getPublicProducts>>): LeadItemInput[] {
  const byDiameter = new Map(products.filter((p) => p.diameterMm).map((p) => [Number(p.diameterMm), p.id]));
  const totals = new Map<string, number>();
  for (const line of lines) {
    const productId = byDiameter.get(line.diameterMm);
    if (productId) totals.set(productId, (totals.get(productId) ?? 0) + line.meters);
  }
  return [...totals].map(([productId, meters]) => ({ productId, meters: String(meters) }));
}

/** Цена за метр с учётом скидки — для расчёта маржи сделки. */
function effectivePrice(result: ReturnType<typeof calculate>): string | null {
  if (!result.goodsTotal || Number(result.totalMeters) === 0) return result.pricePerMeter;
  return dec(result.goodsTotal).div(result.totalMeters).toDecimalPlaces(2).toFixed(2);
}

export async function createLead(input: CreateLeadInput): Promise<{ id: string; number: number; dealId: string }> {
  const [products, cities, rules, promo] = await Promise.all([
    getPublicProducts(), getDeliveryCities(), getDiscountRules(), findValidPromo(input.promoCode),
  ]);
  const city = cities.find((c) => c.slug === input.citySlug) ?? null;
  const cityName = city ? pick(city, 'name', 'ru') : input.city?.trim() || null;

  const requested = [...(input.items ?? []), ...specToItems(input.specLines ?? [], products)];
  const calculated = requested.flatMap((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) return [];
    const result = calculate(
      toCalcProduct(product, product.nameRu),
      city ? toCalcCity(city, city.nameRu) : null,
      rules,
      { meters: item.meters, coils: item.coils, bars: item.bars, buyerType: input.buyerType, promoPercent: promo?.percent },
    );
    return [{ product, result }];
  });

  const purchase = await getPurchasePriceMap(calculated.map((c) => c.product.id));
  const lines = calculated.map(({ product, result }) => ({
    productId: product.id,
    meters: result.totalMeters,
    salePrice: effectivePrice(result),
    purchasePrice: purchase.get(product.id) ?? null,
  }));
  const margin = computeMargin(lines.filter((l) => Number(l.meters) > 0));

  // Снимок для клиента и менеджера — без закупочных цен.
  const payload = {
    items: calculated.map(({ product, result }) => ({
      productId: product.id, name: product.nameRu, totalMeters: result.totalMeters,
      pricePerMeter: result.pricePerMeter, priceIsDemo: result.priceIsDemo,
      discountPercent: result.discountPercent, goodsTotal: result.goodsTotal, massKg: result.massKg,
    })),
    city: cityName,
    delivery: city?.tariffConfirmed ? 'confirmed' : 'manager',
    promo: promo?.code ?? null,
    specLines: input.specLines?.length ?? 0,
  };

  const created = await db.transaction(async (tx) => {
    const customerId = await upsertCustomer(tx, input, cityName);
    const [lead] = await tx.insert(leads).values({
      source: input.source, customerId, city: cityName, buyerType: input.buyerType,
      message: input.message ?? null, payload, attachments: input.attachments ?? [], locale: input.locale,
    }).returning({ id: leads.id, number: leads.number });

    const [deal] = await tx.insert(deals).values({
      leadId: lead.id, customerId, city: cityName,
      totalSale: margin.totalSale, totalPurchase: margin.totalPurchase, expectedMargin: margin.margin,
    }).returning({ id: deals.id });

    const positive = lines.filter((l) => Number(l.meters) > 0);
    if (positive.length > 0) {
      await tx.insert(dealItems).values(positive.map((l) => ({ dealId: deal.id, ...l })));
    }
    await tx.insert(dealEvents).values({
      dealId: deal.id, type: 'SYSTEM',
      text: `Заявка №${lead.number} создана автоматически. Источник: ${SOURCE_LABELS[input.source]}.`,
    });
    return { id: lead.id, number: lead.number, dealId: deal.id };
  });

  if (promo) await registerPromoUse(promo.code);

  const total = margin.totalSale ? `, ~${formatTenge(margin.totalSale)}` : '';
  await notifyManagers(
    `Новая заявка №${created.number} (${SOURCE_LABELS[input.source]})\n${input.name}, ${normalizePhone(input.phone)}` +
    `${cityName ? `, ${cityName}` : ''}${total}`,
  );
  return created;
}
