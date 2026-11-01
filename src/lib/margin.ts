/** Расчёт себестоимости и маржи сделки (только для админки). */
import { dec, roundMoney, Decimal } from './money';

export type MarginLine = { meters: string; salePrice: string | null; purchasePrice: string | null };

export type MarginResult = {
  totalSale: string | null;
  totalPurchase: string | null;
  margin: string | null;
  marginPercent: string | null;
};

/** Маржа по товару: продажа − закупка. Доставка выставляется клиенту отдельно (транзитом). */
export function computeMargin(lines: MarginLine[]): MarginResult {
  const allSale = lines.length > 0 && lines.every((l) => l.salePrice !== null);
  const allPurchase = lines.length > 0 && lines.every((l) => l.purchasePrice !== null);

  const sum = (pick: (l: MarginLine) => string | null) =>
    roundMoney(lines.reduce((acc, l) => acc.plus(dec(l.meters).mul(dec(pick(l)))), new Decimal(0)));

  const totalSale = allSale ? sum((l) => l.salePrice) : null;
  const totalPurchase = allPurchase ? sum((l) => l.purchasePrice) : null;
  if (!totalSale || !totalPurchase) {
    return {
      totalSale: totalSale?.toFixed(2) ?? null,
      totalPurchase: totalPurchase?.toFixed(2) ?? null,
      margin: null,
      marginPercent: null,
    };
  }
  const margin = totalSale.minus(totalPurchase);
  return {
    totalSale: totalSale.toFixed(2),
    totalPurchase: totalPurchase.toFixed(2),
    margin: margin.toFixed(2),
    marginPercent: totalSale.isZero() ? null : margin.div(totalSale).mul(100).toDecimalPlaces(1).toString(),
  };
}

/** Цена продажи от закупки с наценкой, округлённая вверх до целого тенге. */
export function priceWithMarkup(purchasePrice: string, markupPercent: string | number): string {
  return dec(purchasePrice).mul(new Decimal(100).plus(markupPercent)).div(100).ceil().toFixed(2);
}
