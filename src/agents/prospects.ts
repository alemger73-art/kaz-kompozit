/**
 * Агент по поиску клиентов: структурирует найденные менеджером открытые источники
 * (закупки, каталоги, сайты компаний) в карточки и готовит персональные черновики обращений.
 * Массовые рассылки не выполняются — каждое обращение отправляет человек вручную.
 */
import 'server-only';
import { db } from '@/db/client';
import { prospects } from '@/db/schema';
import { getLlm } from './llm';
import { logRun } from './runs';
import { assertToolAllowed } from './tools';

type ProspectInput = { name: string; city: string | null; url: string | null; notes: string | null };

/** Строка: «Название; Город; Ссылка или источник; Заметка» */
export function parseProspectLines(text: string): ProspectInput[] {
  return text.split('\n').map((line) => line.split(';').map((p) => p.trim())).filter((p) => p[0])
    .slice(0, 50)
    .map(([name, city, url, notes]) => ({ name: name.slice(0, 200), city: city || null, url: url || null, notes: notes || null }));
}

function templateMessage(p: ProspectInput, companyName: string): string {
  return `Здравствуйте! Меня зовут ___, ${companyName}, Караганда. ` +
    `Мы поставляем стеклокомпозитную арматуру по Казахстану${p.city ? `, включая ${p.city}` : ''}. ` +
    `${p.notes ? `Увидели, что у вас ${p.notes.toLowerCase()}. ` : ''}` +
    'Можем подготовить расчёт и коммерческое предложение под ваш объём. Удобно ли обсудить?';
}

export async function saveProspects(text: string, companyName: string, source: string) {
  assertToolAllowed('prospects', 'prospects.save');
  const items = parseProspectLines(text);
  const llm = getLlm();
  const saved: string[] = [];
  for (const item of items) {
    let draft = templateMessage(item, companyName);
    if (llm) {
      try {
        draft = await llm.complete(
          'Ты пишешь короткое персональное деловое обращение (до 500 знаков) от поставщика стеклокомпозитной арматуры из Караганды. Без выдуманных фактов, цен и обещаний. Только по-русски.',
          [{ role: 'user', content: JSON.stringify({ ...item, supplier: companyName }) }], 400,
        );
      } catch {
        // При сбое модели остаётся шаблон.
      }
    }
    await db.insert(prospects).values({ ...item, source, draftMessage: draft });
    saved.push(item.name);
  }
  await logRun('prospects', 'save_prospects', { count: items.length, source }, { saved });
  return saved.length;
}
