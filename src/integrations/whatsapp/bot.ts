/**
 * Сценарий бота WhatsApp — чистая функция без доступа к БД.
 * Шаги: приветствие → диаметр → метраж → город → имя → заявка в CRM.
 * Цены бот не называет — расчёт и КП готовит менеджер.
 */
import type { WaState } from '@/db/schema';

export type BotProduct = { id: string; name: string; diameterMm: number | null };
export type BotCity = { slug: string; name: string };
export type BotContext = { companyName: string; products: BotProduct[]; cities: BotCity[] };

export type BotResult = {
  state: WaState;
  replies: string[];
  action?: 'create_lead' | 'handoff';
};

const HANDOFF = /(менеджер|оператор|человек|позвон|адам|маман)/i;
const RESTART = /^(старт|начать|start|меню|заново|\/start)$/i;

function parseNumber(text: string): number | null {
  const match = text.replace(/\s/g, '').replace(',', '.').match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function diameterPrompt(ctx: BotContext): string {
  const list = ctx.products.filter((p) => p.diameterMm).map((p) => `${p.diameterMm} мм`).join(', ');
  return `Какой диаметр арматуры нужен? Доступно: ${list}. Напишите число, например «8».`;
}

export function nextStep(current: WaState, rawText: string, ctx: BotContext): BotResult {
  const text = rawText.trim();

  if (HANDOFF.test(text)) {
    return { state: current, action: 'handoff', replies: ['Передаю ваш вопрос менеджеру — он ответит в рабочее время.'] };
  }

  if (!current.step || current.step === 'done' || RESTART.test(text)) {
    return {
      state: { step: 'diameter' },
      replies: [
        `Здравствуйте! Это ${ctx.companyName} — стеклокомпозитная арматура с доставкой по Казахстану.`,
        diameterPrompt(ctx),
        'Чтобы связаться с менеджером, напишите «менеджер».',
      ],
    };
  }

  switch (current.step) {
    case 'diameter': {
      const diameter = parseNumber(text);
      const product = ctx.products.find((p) => p.diameterMm !== null && p.diameterMm === diameter);
      if (!product) return { state: current, replies: [`Не нашёл такой диаметр. ${diameterPrompt(ctx)}`] };
      return { state: { ...current, step: 'meters', productId: product.id }, replies: [`${product.name}. Сколько метров нужно?`] };
    }
    case 'meters': {
      const meters = parseNumber(text);
      if (!meters || meters <= 0 || meters > 10_000_000) {
        return { state: current, replies: ['Напишите количество метров числом, например «500».'] };
      }
      const cities = ctx.cities.filter((c) => c.slug !== 'other').map((c) => c.name).join(', ');
      return { state: { ...current, step: 'city', meters: String(meters) }, replies: [`Принято: ${meters} м. В какой город доставка? Например: ${cities}.`] };
    }
    case 'city': {
      const city = ctx.cities.find((c) => text.toLowerCase().includes(c.name.toLowerCase().slice(0, 5)));
      return {
        state: { ...current, step: 'name', city: city?.slug ?? text.slice(0, 100) },
        replies: ['Как к вам обращаться?'],
      };
    }
    case 'name': {
      const name = text.slice(0, 120) || 'Клиент WhatsApp';
      return {
        state: { ...current, step: 'done', name },
        action: 'create_lead',
        replies: [`Спасибо, ${name}! Заявка передана менеджеру: он рассчитает стоимость и доставку и пришлёт коммерческое предложение.`],
      };
    }
    default:
      return { state: { step: 'diameter' }, replies: [diameterPrompt(ctx)] };
  }
}
