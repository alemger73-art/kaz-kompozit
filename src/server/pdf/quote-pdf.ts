/**
 * Генерация КП в PDF (серверная, PDFKit). Содержит только цены продажи из снимка КП.
 */
import 'server-only';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import type { QuoteLine } from '@/db/schema';
import { formatNumber, formatTenge } from '@/lib/money';

export type QuotePdfData = {
  number: number;
  status: 'DRAFT' | 'APPROVED' | 'SENT';
  createdAt: Date;
  validUntil: Date;
  lines: QuoteLine[];
  discount: string | null;
  deliveryCost: string | null;
  total: string;
  terms: string | null;
  company: {
    name: string; legalName: string | null; phone: string | null; whatsapp: string | null; email: string | null;
    city: string; address: string | null;
  };
  client: { name: string; company: string | null; bin: string | null; phone: string; city: string | null };
};

const FONT_DIR = path.join(process.cwd(), 'assets', 'fonts');
const COLORS = { ink: '#181b1e', muted: '#646c75', line: '#d3d7db', accent: '#ff5b14', soft: '#f5f6f7' };

const date = (value: Date) =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Almaty', day: '2-digit', month: '2-digit', year: 'numeric' }).format(value);

/** Неразрывные пробелы из formatTenge PDFKit рисует корректно, но «₸» есть не во всех шрифтах — в DejaVu есть. */
export function renderQuotePdf(data: QuotePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `КП №${data.number}`, Author: data.company.name } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('regular', path.join(FONT_DIR, 'DejaVuSans.ttf'));
    doc.registerFont('bold', path.join(FONT_DIR, 'DejaVuSans-Bold.ttf'));
    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;

    // Шапка
    doc.rect(0, 0, doc.page.width, 8).fill(COLORS.accent);
    // Логотип: фирменный знак (оранжевый квадрат с буквой) и название.
    doc.roundedRect(left, 32, 30, 30, 4).fill(COLORS.accent);
    doc.fillColor('#ffffff').font('bold').fontSize(16).text(data.company.name.slice(0, 1), left, 39, { width: 30, align: 'center' });
    doc.fillColor(COLORS.ink).font('bold').fontSize(18).text(data.company.name, left + 40, 36);
    doc.font('regular').fontSize(8.5).fillColor(COLORS.muted);
    const contacts = [data.company.legalName, [data.company.city, data.company.address].filter(Boolean).join(', '),
      data.company.phone && `Тел.: ${data.company.phone}`, data.company.whatsapp && `WhatsApp: ${data.company.whatsapp}`,
      data.company.email].filter(Boolean).join('  ·  ');
    doc.text(contacts, left + 40, 58, { width: width - 40 });

    doc.font('bold').fontSize(15).fillColor(COLORS.ink).text(`Коммерческое предложение №${data.number}`, left, 96);
    doc.font('regular').fontSize(9.5).fillColor(COLORS.muted)
      .text(`от ${date(data.createdAt)} · действительно до ${date(data.validUntil)}`, left);
    const afterTitle = doc.y;

    if (data.status === 'DRAFT') {
      doc.save().rotate(-30, { origin: [doc.page.width / 2, doc.page.height / 2] })
        .font('bold').fontSize(64).fillColor(COLORS.accent).opacity(0.08)
        .text('ЧЕРНОВИК', 0, doc.page.height / 2 - 40, { width: doc.page.width, align: 'center' }).restore();
      doc.opacity(1);
    }
    doc.y = afterTitle;

    // Клиент
    const clientTop = afterTitle + 18;
    doc.rect(left, clientTop, width, 52).fill(COLORS.soft);
    doc.fillColor(COLORS.muted).font('regular').fontSize(8).text('КЛИЕНТ', left + 12, clientTop + 9);
    doc.fillColor(COLORS.ink).font('bold').fontSize(10.5)
      .text(data.client.company || data.client.name, left + 12, clientTop + 21, { width: width - 24 });
    doc.font('regular').fontSize(8.5).fillColor(COLORS.muted).text(
      [data.client.company ? data.client.name : null, data.client.bin && `БИН ${data.client.bin}`, data.client.phone, data.client.city]
        .filter(Boolean).join('  ·  '),
      left + 12, clientTop + 35, { width: width - 24 },
    );
    doc.y = clientTop + 70;

    // Таблица
    const cols = [
      { title: '№', w: 24, align: 'left' as const },
      { title: 'Наименование', w: width - 24 - 70 - 90 - 100, align: 'left' as const },
      { title: 'Кол-во, м', w: 70, align: 'right' as const },
      { title: 'Цена, ₸/м', w: 90, align: 'right' as const },
      { title: 'Сумма', w: 100, align: 'right' as const },
    ];
    const drawRow = (cells: string[], bold = false, header = false) => {
      const top = doc.y;
      let x = left;
      doc.font(bold ? 'bold' : 'regular').fontSize(header ? 8 : 9.5).fillColor(header ? COLORS.muted : COLORS.ink);
      const heights = cells.map((cell, i) => doc.heightOfString(cell, { width: cols[i].w - 8 }));
      const rowHeight = Math.max(...heights) + 12;
      cells.forEach((cell, i) => {
        doc.text(cell, x + 4, top + 6, { width: cols[i].w - 8, align: cols[i].align });
        x += cols[i].w;
      });
      doc.moveTo(left, top + rowHeight).lineTo(left + width, top + rowHeight).lineWidth(0.5).strokeColor(COLORS.line).stroke();
      doc.y = top + rowHeight;
    };
    drawRow(cols.map((c) => c.title.toUpperCase()), true, true);
    data.lines.forEach((line, i) => drawRow([
      String(i + 1), line.name, formatNumber(line.meters), formatTenge(line.pricePerMeter), formatTenge(line.amount),
    ]));

    // Итоги
    doc.moveDown(0.8);
    const summary: Array<[string, string, boolean?]> = [];
    if (data.discount) summary.push(['Скидка', `−${formatTenge(data.discount)}`]);
    summary.push(['Доставка', data.deliveryCost ? formatTenge(data.deliveryCost) : 'рассчитывается отдельно']);
    summary.push(['ИТОГО', formatTenge(data.total), true]);
    for (const [label, value, strong] of summary) {
      const y = doc.y;
      doc.font(strong ? 'bold' : 'regular').fontSize(strong ? 12 : 9.5).fillColor(strong ? COLORS.ink : COLORS.muted)
        .text(label, left + width - 260, y, { width: 120, align: 'right' });
      doc.fillColor(COLORS.ink).text(value, left + width - 140, y, { width: 140, align: 'right' });
      doc.moveDown(0.4);
    }

    // Условия
    doc.moveDown(1.5);
    doc.font('bold').fontSize(9.5).fillColor(COLORS.ink).text('Условия', left, doc.y);
    doc.font('regular').fontSize(8.5).fillColor(COLORS.muted).text(
      data.terms && /проектн/i.test(data.terms)
        ? data.terms
        : [data.terms, 'Применение арматуры в несущих конструкциях — только по проектному расчёту.'].filter(Boolean).join('\n'),
      { width },
    );

    doc.end();
  });
}
