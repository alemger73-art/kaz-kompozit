import { describe, expect, it } from 'vitest';
import { nextStep, type BotContext } from '@/integrations/whatsapp/bot';

const ctx: BotContext = {
  companyName: 'KAZ KOMPOZIT',
  products: [{ id: 'p8', name: 'Арматура 8 мм', diameterMm: 8 }, { id: 'p10', name: 'Арматура 10 мм', diameterMm: 10 }],
  cities: [{ slug: 'karaganda', name: 'Караганда' }, { slug: 'astana', name: 'Астана' }, { slug: 'other', name: 'Другой город' }],
};

describe('бот WhatsApp', () => {
  it('проводит клиента по шагам и создаёт заявку', () => {
    let r = nextStep({}, 'Здравствуйте', ctx);
    expect(r.state.step).toBe('diameter');
    r = nextStep(r.state, '8 мм', ctx);
    expect(r.state.productId).toBe('p8');
    r = nextStep(r.state, '1 500', ctx);
    expect(r.state.meters).toBe('1500');
    r = nextStep(r.state, 'в Астану', ctx);
    expect(r.state.city).toBe('astana');
    r = nextStep(r.state, 'Иван', ctx);
    expect(r.action).toBe('create_lead');
    expect(r.state.step).toBe('done');
  });
  it('переспрашивает несуществующий диаметр', () => {
    const r = nextStep({ step: 'diameter' }, '14', ctx);
    expect(r.state.step).toBe('diameter');
  });
  it('передаёт диалог менеджеру по запросу', () => {
    expect(nextStep({ step: 'meters' }, 'позовите менеджера', ctx).action).toBe('handoff');
  });
  it('не называет цены', () => {
    const replies = [nextStep({}, 'привет', ctx), nextStep({ step: 'diameter' }, '8', ctx)].flatMap((r) => r.replies).join(' ');
    expect(replies).not.toMatch(/₸|тенге/);
  });
});
