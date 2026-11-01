/**
 * Калькулятор стоимости арматуры — чистые функции без доступа к БД.
 * Принимает только публичные данные (цены продажи), закупочных цен здесь нет.
 */
import { dec, decOrNull, roundMoney, applyPercentDiscount, Decimal } from './money';

export type PublicPrice = {
  /** Цена за метр или null — «по запросу» */
  value: string | null;
  demo: boolean;
};

export type CalcProduct = {
  id: string;
  name: string;
  coilLengthM: number | null;
  barLengthM: string | null;
  minOrderM: number | null;
  massPerMeterKg: string | null;
  massVerified: boolean;
  retail: PublicPrice;
  wholesale: PublicPrice;
};

export type CalcCity = {
  slug: string;
  name: string;
  tariff: string | null;
  tariffConfirmed: boolean;
};

export type CalcDiscountRule = { minMeters: number; percent: string; wholesaleOnly: boolean };

export type CalcInput = {
  meters?: number | string;
  coils?: number;
  bars?: number;
  buyerType: 'PRIVATE' | 'WHOLESALE';
  promoPercent?: string | null;
};

export type CalcResult = {
  totalMeters: string;
  belowMinOrder: boolean;
  pricePerMeter: string | null;
  priceIsDemo: boolean;
  appliedTier: 'RETAIL' | 'WHOLESALE' | null;
  subtotal: string | null;
  discountPercent: string;
  discountAmount: string | null;
  goodsTotal: string | null;
  massKg: string | null;
  delivery: { status: 'confirmed' | 'manager'; cost: string | null };
  /** Итог — только если подтверждены и цена, и доставка */
  grandTotal: string | null;
};

function nonNegative(value: number | string | undefined): Decimal {
  const parsed = dec(value === '' || value === undefined ? 0 : value);
  return parsed.isNaN() || parsed.isNegative() ? new Decimal(0) : parsed;
}

export function totalMetersOf(product: CalcProduct, input: CalcInput): Decimal {
  const meters = nonNegative(input.meters);
  const coils = nonNegative(input.coils).floor();
  const bars = nonNegative(input.bars).floor();
  const coilMeters = product.coilLengthM ? coils.mul(product.coilLengthM) : new Decimal(0);
  const barMeters = product.barLengthM ? bars.mul(product.barLengthM) : new Decimal(0);
  return meters.plus(coilMeters).plus(barMeters);
}

function pickPrice(product: CalcProduct, buyerType: CalcInput['buyerType']) {
  if (buyerType === 'WHOLESALE' && product.wholesale.value) {
    return { tier: 'WHOLESALE' as const, price: product.wholesale };
  }
  if (product.retail.value) return { tier: 'RETAIL' as const, price: product.retail };
  return null;
}

export function bestDiscountPercent(
  rules: CalcDiscountRule[], totalMeters: Decimal, buyerType: CalcInput['buyerType'],
): Decimal {
  return rules
    .filter((r) => totalMeters.gte(r.minMeters) && (!r.wholesaleOnly || buyerType === 'WHOLESALE'))
    .reduce((best, r) => Decimal.max(best, dec(r.percent)), new Decimal(0));
}

export function calculate(
  product: CalcProduct,
  city: CalcCity | null,
  rules: CalcDiscountRule[],
  input: CalcInput,
): CalcResult {
  const totalMeters = totalMetersOf(product, input);
  const picked = pickPrice(product, input.buyerType);

  const rulePercent = bestDiscountPercent(rules, totalMeters, input.buyerType);
  const promoPercent = input.buyerType === 'WHOLESALE' ? dec(input.promoPercent ?? 0) : new Decimal(0);
  // Скидки применяются последовательно: сначала по объёму, затем промокод.
  const combinedFactor = new Decimal(1).minus(rulePercent.div(100)).mul(new Decimal(1).minus(promoPercent.div(100)));
  const discountPercent = new Decimal(1).minus(combinedFactor).mul(100).toDecimalPlaces(2);

  let subtotal: Decimal | null = null;
  let goodsTotal: Decimal | null = null;
  if (picked?.price.value) {
    subtotal = roundMoney(totalMeters.mul(picked.price.value));
    goodsTotal = applyPercentDiscount(subtotal, discountPercent);
  }

  const tariff = city?.tariffConfirmed ? decOrNull(city.tariff) : null;
  const delivery = tariff
    ? { status: 'confirmed' as const, cost: tariff.toFixed(2) }
    : { status: 'manager' as const, cost: null };

  const massKg = product.massVerified && product.massPerMeterKg
    ? totalMeters.mul(product.massPerMeterKg).toDecimalPlaces(2).toString()
    : null;

  const grandTotal = goodsTotal && tariff && totalMeters.gt(0) ? goodsTotal.plus(tariff).toFixed(2) : null;

  return {
    totalMeters: totalMeters.toDecimalPlaces(2).toString(),
    belowMinOrder: product.minOrderM !== null && totalMeters.gt(0) && totalMeters.lt(product.minOrderM),
    pricePerMeter: picked?.price.value ?? null,
    priceIsDemo: picked?.price.demo ?? false,
    appliedTier: picked?.tier ?? null,
    subtotal: subtotal?.toFixed(2) ?? null,
    discountPercent: discountPercent.toString(),
    discountAmount: subtotal && goodsTotal ? subtotal.minus(goodsTotal).toFixed(2) : null,
    goodsTotal: goodsTotal?.toFixed(2) ?? null,
    massKg,
    delivery,
    grandTotal,
  };
}
