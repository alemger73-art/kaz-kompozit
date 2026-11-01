import { describe, expect, it } from 'vitest';
import { calculate, type CalcProduct } from '@/lib/calculator';

const product: CalcProduct = {
  id: 'p8', name: 'Арматура 8 мм', coilLengthM: 100, barLengthM: '6', minOrderM: 100,
  massPerMeterKg: '0.08', massVerified: true,
  retail: { value: '210', demo: false },
  wholesale: { value: '185.50', demo: false },
};
const rules = [
  { minMeters: 2000, percent: '3', wholesaleOnly: true },
  { minMeters: 10000, percent: '5', wholesaleOnly: true },
];

describe('калькулятор арматуры', () => {
  it('суммирует метры, бухты и прутки', () => {
    const r = calculate(product, null, rules, { meters: '50', coils: 2, bars: 5, buyerType: 'PRIVATE' });
    expect(r.totalMeters).toBe('280');
    expect(r.subtotal).toBe('58800.00');
    expect(r.goodsTotal).toBe('58800.00');
  });

  it('не использует float: 0.1 + 0.2 метра считаются точно', () => {
    const r = calculate({ ...product, coilLengthM: null }, null, [], { meters: '0.3', buyerType: 'PRIVATE' });
    expect(r.subtotal).toBe('63.00');
  });

  it('применяет оптовую цену и наибольшую скидку за объём', () => {
    const r = calculate(product, null, rules, { meters: '12000', buyerType: 'WHOLESALE' });
    expect(r.appliedTier).toBe('WHOLESALE');
    expect(r.subtotal).toBe('2226000.00');
    expect(r.discountPercent).toBe('5');
    expect(r.goodsTotal).toBe('2114700.00');
  });

  it('частному покупателю оптовая скидка не даётся', () => {
    const r = calculate(product, null, rules, { meters: '12000', buyerType: 'PRIVATE' });
    expect(r.discountPercent).toBe('0');
  });

  it('промокод применяется после скидки за объём', () => {
    const r = calculate(product, null, rules, { meters: '2000', buyerType: 'WHOLESALE', promoPercent: '2' });
    // 1 - 0.97 * 0.98 = 4.94 %
    expect(r.discountPercent).toBe('4.94');
    expect(r.goodsTotal).toBe('352672.60'); // 371 000 × 0,9506
  });

  it('без подтверждённого тарифа доставки итог не показывается', () => {
    const r = calculate(product, { slug: 'astana', name: 'Астана', tariff: '50000', tariffConfirmed: false }, [], { meters: '100', buyerType: 'PRIVATE' });
    expect(r.delivery.status).toBe('manager');
    expect(r.grandTotal).toBeNull();
  });

  it('с подтверждённым тарифом показывает итоговую сумму', () => {
    const r = calculate(product, { slug: 'astana', name: 'Астана', tariff: '50000', tariffConfirmed: true }, [], { meters: '100', buyerType: 'PRIVATE' });
    expect(r.grandTotal).toBe('71000.00');
  });

  it('без цены — «по запросу», без суммы', () => {
    const r = calculate({ ...product, retail: { value: null, demo: false }, wholesale: { value: null, demo: false } }, null, [], { meters: '100', buyerType: 'PRIVATE' });
    expect(r.pricePerMeter).toBeNull();
    expect(r.subtotal).toBeNull();
  });

  it('масса считается только по подтверждённым данным', () => {
    expect(calculate(product, null, [], { meters: '1000', buyerType: 'PRIVATE' }).massKg).toBe('80');
    expect(calculate({ ...product, massVerified: false }, null, [], { meters: '1000', buyerType: 'PRIVATE' }).massKg).toBeNull();
  });

  it('отрицательные и некорректные значения игнорируются', () => {
    const r = calculate(product, null, [], { meters: '-5', coils: -3, buyerType: 'PRIVATE' });
    expect(r.totalMeters).toBe('0');
  });

  it('предупреждает о минимальном заказе', () => {
    expect(calculate(product, null, [], { meters: '50', buyerType: 'PRIVATE' }).belowMinOrder).toBe(true);
  });
});
