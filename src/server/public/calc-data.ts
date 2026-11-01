import 'server-only';
import type { CalcOption } from '@/components/site/calculator';
import { pick, type Locale } from '@/lib/i18n';
import { formatNumber } from '@/lib/money';
import {
  getDeliveryCities, getDiscountRules, getPublicProducts, toCalcCity, toCalcProduct,
} from './catalog';

/** Данные для калькулятора на клиенте — только публичные поля. */
export async function getCalcData(locale: Locale) {
  const [products, cities, rules] = await Promise.all([getPublicProducts(), getDeliveryCities(), getDiscountRules()]);
  const options: CalcOption[] = products.map((p) => ({
    ...toCalcProduct(p, pick(p, 'name', locale)),
    shortLabel: p.diameterMm ? `${formatNumber(p.diameterMm, 1)} мм` : pick(p, 'name', locale),
  }));
  return {
    products: options,
    cities: cities.map((c) => toCalcCity(c, pick(c, 'name', locale))),
    rules,
  };
}
