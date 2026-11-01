/** Правила показа цен продажи клиентам. */
import type { PublicPrice } from './calculator';

type SalePriceRow = { pricePerMeter: string | null; approved: boolean; demo: boolean } | undefined;

/**
 * Утверждённая цена показывается всегда.
 * Демо-цена — только в тестовом режиме и с пометкой.
 * Иначе — «Цена по запросу» (value = null).
 */
export function toPublicPrice(row: SalePriceRow, testMode: boolean): PublicPrice {
  if (!row?.pricePerMeter) return { value: null, demo: false };
  if (row.approved) return { value: row.pricePerMeter, demo: false };
  if (testMode && row.demo) return { value: row.pricePerMeter, demo: true };
  return { value: null, demo: false };
}
