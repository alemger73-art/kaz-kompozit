/**
 * Разбор спецификации клиента (Excel/CSV): ищет столбцы «диаметр» и «метры/количество».
 * Результат — список позиций для предварительного расчёта. PDF не разбирается.
 */
import 'server-only';
import ExcelJS from 'exceljs';

export type SpecLine = { diameterMm: number; meters: number };

const DIAMETER_HEADERS = /диам|diam|ø|d,?\s*мм|размер/i;
const METERS_HEADERS = /метр|кол|м\.?\s*п|длина|qty|amount|объ[её]м/i;

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const raw = typeof value === 'object' && value !== null && 'result' in value ? (value as { result: unknown }).result : value;
  const parsed = Number(String(raw).replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function extract(rows: unknown[][]): SpecLine[] {
  const headerIndex = rows.findIndex((row) => row.some((c) => DIAMETER_HEADERS.test(String(c ?? ''))));
  if (headerIndex === -1) return [];
  const header = rows[headerIndex].map((c) => String(c ?? ''));
  const dCol = header.findIndex((h) => DIAMETER_HEADERS.test(h));
  const mCol = header.findIndex((h, i) => i !== dCol && METERS_HEADERS.test(h));
  if (dCol === -1 || mCol === -1) return [];

  const lines: SpecLine[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const diameterMm = toNumber(row[dCol]);
    const meters = toNumber(row[mCol]);
    if (diameterMm && meters && diameterMm <= 50) lines.push({ diameterMm, meters });
  }
  return lines.slice(0, 200);
}

function parseCsv(text: string): unknown[][] {
  const delimiter = (text.split('\n')[0].match(/;/g)?.length ?? 0) > (text.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  return text.split(/\r?\n/).map((line) => line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, '')));
}

export async function parseSpecification(file: File): Promise<SpecLine[]> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith('.csv')) return extract(parseCsv(await file.text()));
    if (name.endsWith('.xlsx')) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ArrayBuffer);
      const sheet = workbook.worksheets[0];
      if (!sheet) return [];
      const rows: unknown[][] = [];
      sheet.eachRow((row) => rows.push((row.values as unknown[]).slice(1)));
      return extract(rows);
    }
  } catch (error) {
    console.error('Не удалось разобрать спецификацию', error);
  }
  return [];
}
