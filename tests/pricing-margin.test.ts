import { describe, expect, it } from 'vitest';
import { computeMargin, priceWithMarkup } from '@/lib/margin';
import { formatTenge } from '@/lib/money';
import { toPublicPrice } from '@/lib/pricing';

describe('публичные цены', () => {
  it('утверждённая цена показывается всегда', () => {
    expect(toPublicPrice({ pricePerMeter: '200', approved: true, demo: false }, false)).toEqual({ value: '200', demo: false });
  });
  it('демо-цена — только в тестовом режиме и с пометкой', () => {
    const row = { pricePerMeter: '200', approved: false, demo: true };
    expect(toPublicPrice(row, true)).toEqual({ value: '200', demo: true });
    expect(toPublicPrice(row, false)).toEqual({ value: null, demo: false });
  });
  it('неутверждённая и не демо — «по запросу»', () => {
    expect(toPublicPrice({ pricePerMeter: '200', approved: false, demo: false }, true).value).toBeNull();
  });
});

describe('маржа и наценка', () => {
  it('считает маржу по позициям', () => {
    const m = computeMargin([
      { meters: '1000', salePrice: '210', purchasePrice: '140' },
      { meters: '500', salePrice: '290', purchasePrice: '190' },
    ]);
    expect(m.totalSale).toBe('355000.00');
    expect(m.totalPurchase).toBe('235000.00');
    expect(m.margin).toBe('120000.00');
    expect(m.marginPercent).toBe('33.8');
  });
  it('без закупочной цены маржа не выдумывается', () => {
    expect(computeMargin([{ meters: '10', salePrice: '100', purchasePrice: null }]).margin).toBeNull();
  });
  it('наценка округляется вверх до тенге', () => {
    expect(priceWithMarkup('95', 35)).toBe('129.00');
    expect(priceWithMarkup('140', '33.3')).toBe('187.00');
  });
  it('формат суммы в тенге', () => {
    expect(formatTenge('1234567.5')).toBe('1 234 567,50 ₸');
    expect(formatTenge('210')).toBe('210 ₸');
  });
});
