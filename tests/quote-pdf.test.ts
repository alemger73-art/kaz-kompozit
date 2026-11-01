import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderQuotePdf } from '@/server/pdf/quote-pdf';

describe('КП в PDF', () => {
  it('формируется с кириллицей и казахскими буквами', async () => {
    const pdf = await renderQuotePdf({
      number: 7, status: 'DRAFT', createdAt: new Date(), validUntil: new Date(), discount: '5000', deliveryCost: null,
      total: '325000.00', terms: 'Цены в тенге. Для несущих конструкций — проектный расчёт.',
      lines: [{ productId: 'a', name: 'Стеклокомпозитная арматура 10 мм', meters: '1500.00', pricePerMeter: '220.00', amount: '330000.00' }],
      company: { name: 'KAZ KOMPOZIT', legalName: 'ИП Пример', phone: '+7 701 000 00 00', whatsapp: null, email: null, city: 'Караганда', address: null },
      client: { name: 'Ерлан', company: 'ТОО «Құрылыс Өнім»', bin: '123456789012', phone: '+77010000000', city: 'Астана' },
    });
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    if (process.env.PDF_OUT) writeFileSync(process.env.PDF_OUT, pdf);
  });
});
