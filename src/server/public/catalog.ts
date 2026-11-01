/**
 * Публичные данные сайта.
 * ВАЖНО: этот модуль не импортирует таблицу закупочных цен и выбирает только явно
 * перечисленные поля — закупочные цены не могут попасть в публичный ответ.
 */
import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/db/client';
import {
  products, salePrices, categories, deliveryCities, discountRules, companySettings,
  faqItems, projects, certificates, seoPages, logisticsPartners,
} from '@/db/schema';
import { toPublicPrice } from '@/lib/pricing';
import { isTestMode } from '@/lib/config';
import type { CalcCity, CalcDiscountRule, CalcProduct, PublicPrice } from '@/lib/calculator';

const publicProductColumns = {
  id: products.id,
  slug: products.slug,
  categoryId: products.categoryId,
  nameRu: products.nameRu,
  nameKk: products.nameKk,
  diameterMm: products.diameterMm,
  descriptionRu: products.descriptionRu,
  descriptionKk: products.descriptionKk,
  specs: products.specs,
  massPerMeterKg: products.massPerMeterKg,
  massVerified: products.massVerified,
  supplyFormats: products.supplyFormats,
  coilLengthM: products.coilLengthM,
  barLengthM: products.barLengthM,
  minOrderM: products.minOrderM,
  availability: products.availability,
  leadTimeRu: products.leadTimeRu,
  leadTimeKk: products.leadTimeKk,
  applicationsRu: products.applicationsRu,
  applicationsKk: products.applicationsKk,
  images: products.images,
  seoTitle: products.seoTitle,
  seoDescription: products.seoDescription,
  updatedAt: products.updatedAt,
};

type ProductRow = Awaited<ReturnType<typeof selectProducts>>[number];

export type PublicProduct = ProductRow & { retail: PublicPrice; wholesale: PublicPrice };

function selectProducts(where = eq(products.published, true)) {
  return db.select(publicProductColumns).from(products).where(where)
    .orderBy(asc(products.sort), asc(products.diameterMm));
}

async function attachPrices(rows: ProductRow[]): Promise<PublicProduct[]> {
  if (rows.length === 0) return [];
  const prices = await db.select({
    productId: salePrices.productId,
    tier: salePrices.tier,
    pricePerMeter: salePrices.pricePerMeter,
    approved: salePrices.approved,
    demo: salePrices.demo,
  }).from(salePrices).where(inArray(salePrices.productId, rows.map((r) => r.id)));

  return rows.map((row) => {
    const find = (tier: 'RETAIL' | 'WHOLESALE') =>
      prices.find((p) => p.productId === row.id && p.tier === tier);
    return {
      ...row,
      retail: toPublicPrice(find('RETAIL'), isTestMode),
      wholesale: toPublicPrice(find('WHOLESALE'), isTestMode),
    };
  });
}

export const getPublicProducts = cache(async () => attachPrices(await selectProducts()));

export const getPublicProduct = cache(async (slug: string) => {
  const rows = await selectProducts(and(eq(products.published, true), eq(products.slug, slug)));
  const [product] = await attachPrices(rows);
  return product ?? null;
});

export const getCategories = cache(() =>
  db.select().from(categories).orderBy(asc(categories.sort)));

export const getDeliveryCities = cache(() =>
  db.select({
    slug: deliveryCities.slug,
    nameRu: deliveryCities.nameRu,
    nameKk: deliveryCities.nameKk,
    regionRu: deliveryCities.regionRu,
    tariff: deliveryCities.tariff,
    tariffConfirmed: deliveryCities.tariffConfirmed,
    leadTimeRu: deliveryCities.leadTimeRu,
    mapX: deliveryCities.mapX,
    mapY: deliveryCities.mapY,
  }).from(deliveryCities).where(eq(deliveryCities.active, true)).orderBy(asc(deliveryCities.sort)));

export const getDiscountRules = cache(async (): Promise<CalcDiscountRule[]> =>
  db.select({
    minMeters: discountRules.minMeters,
    percent: discountRules.percent,
    wholesaleOnly: discountRules.wholesaleOnly,
  }).from(discountRules).where(eq(discountRules.active, true)));

export const getSettings = cache(async () => {
  const [settings] = await db.select().from(companySettings).where(eq(companySettings.id, 1));
  return settings ?? {
    id: 1, companyName: 'KAZ KOMPOZIT', legalName: null, phone: null, whatsapp: null, email: null,
    cityRu: 'Караганда', cityKk: 'Қарағанды', address: null, addressConfirmed: false, mapEmbedUrl: null,
    workHours: null, instagram: null, telegram: null, logoUrl: null, aboutRu: null, aboutKk: null,
    quoteTerms: null, quoteValidDays: 7, updatedAt: new Date(),
  };
});

export type PublicSettings = Awaited<ReturnType<typeof getSettings>>;

export const getFaq = cache(() => db.select().from(faqItems).orderBy(asc(faqItems.sort)));

export const getPublishedProjects = cache(() =>
  db.select().from(projects).where(eq(projects.published, true)));

export const getPublishedCertificates = cache((productId?: string) =>
  db.select().from(certificates).where(productId
    ? and(eq(certificates.published, true), eq(certificates.productId, productId))
    : eq(certificates.published, true)));

export const getPublishedPartners = cache(() =>
  db.select({ name: logisticsPartners.name }).from(logisticsPartners)
    .where(and(eq(logisticsPartners.published, true), eq(logisticsPartners.verified, true))));

export const getSeoOverride = cache(async (path: string) => {
  const [row] = await db.select().from(seoPages).where(eq(seoPages.path, path));
  return row ?? null;
});

/** Данные для калькулятора — только публичные поля. */
export function toCalcProduct(product: PublicProduct, name: string): CalcProduct {
  return {
    id: product.id,
    name,
    coilLengthM: product.coilLengthM,
    barLengthM: product.barLengthM,
    minOrderM: product.minOrderM,
    massPerMeterKg: product.massPerMeterKg,
    massVerified: product.massVerified,
    retail: product.retail,
    wholesale: product.wholesale,
  };
}

export function toCalcCity(city: Awaited<ReturnType<typeof getDeliveryCities>>[number], name: string): CalcCity {
  return { slug: city.slug, name, tariff: city.tariff, tariffConfirmed: city.tariffConfirmed };
}
