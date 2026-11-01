/** Агент-продавец: черновик ответа клиенту по сделке. Цены называет только утверждённые. */
import 'server-only';
import { formatNumber, formatTenge } from '@/lib/money';
import { getLlm } from './llm';
import { failRun, logRun } from './runs';
import { toolCatalog, toolDeal } from './tools';

const SYSTEM = `Ты — вежливый менеджер по продажам стеклокомпозитной арматуры в Казахстане.
Пиши по-русски, коротко и по делу. Правила:
- Не придумывай технические характеристики, цены, сроки и скидки — используй только переданные данные.
- Если цены нет, пиши, что менеджер рассчитает и пришлёт КП.
- Не обещай доставку по конкретной цене: стоимость рассчитывает менеджер.
- Для несущих конструкций напоминай о проектном расчёте.
- Задай 1–2 уточняющих вопроса, если не хватает диаметра, объёма или города.`;

export async function draftSalesReply(dealId: string): Promise<string> {
  const context = await toolDeal('sales', dealId);
  if (!context) throw new Error('Сделка не найдена');
  const catalog = await toolCatalog('sales');
  const { customer, items, deal } = context;

  const facts = {
    client: customer?.name,
    city: deal.city,
    items: items.map((i) => ({ name: i.name, meters: i.meters })),
    catalog,
  };

  const llm = getLlm();
  try {
    let text: string;
    if (llm) {
      text = await llm.complete(SYSTEM, [{ role: 'user', content: `Данные (JSON): ${JSON.stringify(facts)}\nНапиши ответ клиенту.` }]);
    } else {
      text = templateReply(facts);
    }
    await logRun('sales', 'draft_reply', { dealId }, { text, provider: llm?.name ?? 'шаблон' });
    return text;
  } catch (error) {
    await failRun('sales', 'draft_reply', { dealId }, error);
    throw error;
  }
}

function templateReply(facts: { client?: string; city: string | null; items: Array<{ name: string; meters: string }>; catalog: Awaited<ReturnType<typeof toolCatalog>> }): string {
  const lines = [`Здравствуйте${facts.client ? `, ${facts.client}` : ''}! Спасибо за обращение.`];
  if (facts.items.length > 0) {
    lines.push(`Вы интересуетесь: ${facts.items.map((i) => `${i.name} — ${formatNumber(i.meters)} м`).join('; ')}.`);
    for (const item of facts.items) {
      const price = facts.catalog.find((c) => c.name === item.name)?.retailPrice;
      if (price) lines.push(`Розничная цена ${item.name}: ${formatTenge(price)} за метр.`);
    }
  } else {
    lines.push('Подскажите, пожалуйста, какой диаметр и какой объём (в метрах) вам нужен?');
  }
  lines.push(facts.city
    ? `Стоимость доставки в ${facts.city} рассчитаем и пришлём вместе с коммерческим предложением.`
    : 'Уточните, пожалуйста, город доставки — рассчитаем стоимость.');
  lines.push('Если арматура нужна для несущих конструкций, диаметр подбирается по проектному расчёту.');
  return lines.join('\n');
}
