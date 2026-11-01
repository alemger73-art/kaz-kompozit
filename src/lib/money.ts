/**
 * Денежная арифметика. Все расчёты — только через Decimal (без float).
 */
import Decimal from 'decimal.js';

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

export type DecimalInput = Decimal.Value | null | undefined;

export function dec(value: DecimalInput): Decimal {
  return new Decimal(value ?? 0);
}

export function decOrNull(value: DecimalInput): Decimal | null {
  if (value === null || value === undefined || value === '') return null;
  return new Decimal(value);
}

/** Округление до тиынов (2 знака). */
export function roundMoney(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** Применяет скидку в процентах. */
export function applyPercentDiscount(amount: Decimal, percent: Decimal): Decimal {
  return roundMoney(amount.mul(new Decimal(100).minus(percent)).div(100));
}

/** Формат суммы: «12 345 ₸» или «12 345,50 ₸». */
export function formatTenge(value: DecimalInput): string {
  const amount = dec(value);
  const hasFraction = !amount.mod(1).isZero();
  const fixed = amount.toFixed(hasFraction ? 2 : 0);
  const [whole, fraction] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${grouped}${fraction ? `,${fraction}` : ''} ₸`;
}

export function formatNumber(value: DecimalInput, maxFraction = 2): string {
  const fixed = dec(value).toDecimalPlaces(maxFraction).toString();
  const [whole, fraction] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return fraction ? `${grouped},${fraction}` : grouped;
}

export { Decimal };
