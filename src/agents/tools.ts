/**
 * Контролируемые инструменты агентов. Агент не имеет прямого доступа к БД — только к этим функциям.
 * Каждый инструмент объявляет, каким агентам он разрешён и нужно ли подтверждение человека.
 */
import 'server-only';
import { asc, eq, isNull, lt, or } from 'drizzle-orm';
import { db } from '@/db/client';
import { customers, dealItems, deals, products, suppliers } from '@/db/schema';
import { getPurchasePriceMap } from '@/server/admin/purchase-prices';
import { getPublicProducts } from '@/server/public/catalog';
import type { AgentName } from './runs';

type ToolSpec = { agents: AgentName[]; requiresApproval: boolean; description: string };

export const TOOL_REGISTRY: Record<string, ToolSpec> = {
  'catalog.public': { agents: ['sales', 'prospects', 'quotes'], requiresApproval: false, description: 'Публичный каталог: товары и утверждённые цены продажи' },
  'deal.read': { agents: ['sales', 'calculator', 'quotes'], requiresApproval: false, description: 'Данные сделки и клиента' },
  'deal.costs': { agents: ['calculator'], requiresApproval: false, description: 'Закупочные цены позиций сделки (внутренние)' },
  'deal.applyPrices': { agents: ['calculator'], requiresApproval: true, description: 'Записать цены продажи в сделку' },
  'quote.draft': { agents: ['quotes'], requiresApproval: false, description: 'Создать ЧЕРНОВИК КП (отправка — только после утверждения)' },
  'suppliers.stale': { agents: ['suppliers'], requiresApproval: false, description: 'Поставщики с устаревшими прайсами' },
  'prospects.save': { agents: ['prospects'], requiresApproval: false, description: 'Сохранить карточку потенциального клиента и черновик обращения' },
};

export function assertToolAllowed(agent: AgentName, tool: keyof typeof TOOL_REGISTRY) {
  if (!TOOL_REGISTRY[tool].agents.includes(agent)) {
    throw new Error(`Агенту «${agent}» запрещён инструмент «${tool}»`);
  }
}

/** Каталог для агента — только публичные данные, утверждённые цены (без демо). */
export async function toolCatalog(agent: AgentName) {
  assertToolAllowed(agent, 'catalog.public');
  const list = await getPublicProducts();
  return list.map((p) => ({
    name: p.nameRu,
    diameterMm: p.diameterMm,
    retailPrice: p.retail.value && !p.retail.demo ? p.retail.value : null,
    wholesalePrice: p.wholesale.value && !p.wholesale.demo ? p.wholesale.value : null,
    minOrderM: p.minOrderM,
    availability: p.availability,
  }));
}

export async function toolDeal(agent: AgentName, dealId: string) {
  assertToolAllowed(agent, 'deal.read');
  const deal = await db.query.deals.findFirst({ where: eq(deals.id, dealId) });
  if (!deal) return null;
  const customer = await db.query.customers.findFirst({ where: eq(customers.id, deal.customerId) });
  const items = await db.select({ productId: dealItems.productId, meters: dealItems.meters, salePrice: dealItems.salePrice, name: products.nameRu })
    .from(dealItems).innerJoin(products, eq(products.id, dealItems.productId)).where(eq(dealItems.dealId, dealId));
  return { deal, customer, items };
}

export async function toolDealCosts(agent: AgentName, productIds: string[]) {
  assertToolAllowed(agent, 'deal.costs');
  return getPurchasePriceMap(productIds);
}

export async function toolStaleSuppliers(agent: AgentName, olderThanDays = 30) {
  assertToolAllowed(agent, 'suppliers.stale');
  const border = new Date(Date.now() - olderThanDays * 24 * 3600 * 1000);
  return db.select().from(suppliers)
    .where(or(isNull(suppliers.priceListUpdatedAt), lt(suppliers.priceListUpdatedAt, border)))
    .orderBy(asc(suppliers.name));
}
