/**
 * Агент-калькулятор: себестоимость, наценка и маржа — только программным кодом (Decimal).
 * Запись цен в сделку — через очередь подтверждения.
 */
import 'server-only';
import { computeMargin, priceWithMarkup } from '@/lib/margin';
import { dec, roundMoney } from '@/lib/money';
import { logRun } from './runs';
import { toolDeal, toolDealCosts } from './tools';

export type PriceProposal = {
  dealId: string;
  markupPercent: string;
  lines: Array<{ productId: string; name: string; meters: string; purchasePrice: string | null; proposedPrice: string | null; amount: string | null }>;
  totalSale: string | null;
  totalPurchase: string | null;
  margin: string | null;
  marginPercent: string | null;
  missingCosts: string[];
};

export async function proposePrices(dealId: string, markupPercent: string): Promise<{ runId: string; proposal: PriceProposal }> {
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(markupPercent)) throw new Error('Наценка — число от 0 до 999');
  const context = await toolDeal('calculator', dealId);
  if (!context) throw new Error('Сделка не найдена');
  const costs = await toolDealCosts('calculator', context.items.map((i) => i.productId));

  const lines = context.items.map((item) => {
    const purchasePrice = costs.get(item.productId) ?? null;
    const proposedPrice = purchasePrice ? priceWithMarkup(purchasePrice, markupPercent) : null;
    return {
      productId: item.productId, name: item.name, meters: item.meters, purchasePrice, proposedPrice,
      amount: proposedPrice ? roundMoney(dec(item.meters).mul(proposedPrice)).toFixed(2) : null,
    };
  });
  const totals = computeMargin(lines.map((l) => ({ meters: l.meters, salePrice: l.proposedPrice, purchasePrice: l.purchasePrice })));
  const proposal: PriceProposal = {
    dealId, markupPercent, lines, ...totals,
    missingCosts: lines.filter((l) => !l.purchasePrice).map((l) => l.name),
  };
  // Запись цен в сделку — обязательство перед клиентом, поэтому только после подтверждения.
  const runId = await logRun('calculator', 'apply_prices', { dealId, markupPercent }, proposal, proposal.missingCosts.length === 0 && lines.length > 0);
  return { runId, proposal };
}
