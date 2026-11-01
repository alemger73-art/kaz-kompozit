import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { customers, deals, leads } from '@/db/schema';
import { DEAL_STATUS_LABELS, SOURCE_LABELS, formatDate } from '@/lib/crm';
import { audit } from '@/server/audit';
import { can, getCurrentUser } from '@/server/auth/session';

/** CSV для Excel: BOM + разделитель «;». */
function toCsv(rows: Array<Array<string | number | null>>): string {
  const escape = (value: string | number | null) => {
    const text = value === null ? '' : String(value);
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return `﻿${rows.map((row) => row.map(escape).join(';')).join('\r\n')}`;
}

async function buildRows(type: string): Promise<Array<Array<string | number | null>> | null> {
  if (type === 'customers') {
    const rows = await db.select().from(customers).orderBy(desc(customers.createdAt));
    return [['Имя', 'Телефон', 'E-mail', 'Компания', 'БИН', 'Город', 'Тип', 'Создан'],
      ...rows.map((c) => [c.name, c.phone, c.email, c.company, c.bin, c.city, c.type === 'WHOLESALE' ? 'Опт' : 'Частный', formatDate(c.createdAt)])];
  }
  if (type === 'leads') {
    const rows = await db.select({ l: leads, name: customers.name, phone: customers.phone })
      .from(leads).innerJoin(customers, eq(customers.id, leads.customerId)).orderBy(desc(leads.createdAt));
    return [['№', 'Дата', 'Источник', 'Клиент', 'Телефон', 'Город', 'Тип', 'Комментарий'],
      ...rows.map(({ l, name, phone }) => [l.number, formatDate(l.createdAt), SOURCE_LABELS[l.source], name, phone, l.city, l.buyerType === 'WHOLESALE' ? 'Опт' : 'Частный', l.message])];
  }
  if (type === 'deals') {
    const rows = await db.select({ d: deals, name: customers.name, company: customers.company })
      .from(deals).innerJoin(customers, eq(customers.id, deals.customerId)).orderBy(desc(deals.createdAt));
    return [['Создана', 'Клиент', 'Компания', 'Статус', 'Город', 'Продажа', 'Себестоимость', 'Маржа', 'Доставка'],
      ...rows.map(({ d, name, company }) => [formatDate(d.createdAt), name, company, DEAL_STATUS_LABELS[d.status], d.city, d.totalSale, d.totalPurchase, d.expectedMargin, d.deliveryCost])];
  }
  return null;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !can(user, 'stats')) return new NextResponse(null, { status: 401 });
  const type = new URL(request.url).searchParams.get('type') ?? '';
  const rows = await buildRows(type);
  if (!rows) return NextResponse.json({ error: 'Неизвестный тип выгрузки' }, { status: 400 });
  await audit(user.id, 'export', type, null, { rows: rows.length - 1 });
  return new NextResponse(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
