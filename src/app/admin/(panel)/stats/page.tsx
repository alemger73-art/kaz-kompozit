import { count, eq, gte, sql, sum } from 'drizzle-orm';
import { PageHeader, Panel, Stat } from '@/components/admin/ui';
import { db } from '@/db/client';
import { deals, leads } from '@/db/schema';
import { SOURCE_LABELS } from '@/lib/crm';
import { formatTenge } from '@/lib/money';
import { requireUser } from '@/server/auth/session';

function Bars({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-sm text-graphite-400">Нет данных</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[140px_1fr_40px] items-center gap-3 text-sm">
          <span className="truncate text-graphite-600">{r.label}</span>
          <span className="h-2 rounded-full bg-graphite-100"><span className="block h-full rounded-full bg-accent-500" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span className="text-right font-bold">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function StatsPage() {
  await requireUser('stats');
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const day = sql<string>`to_char(${leads.createdAt} at time zone 'Asia/Almaty', 'DD.MM')`;

  const [bySource, byCity, byDay, [totals], [completed], [lost]] = await Promise.all([
    db.select({ source: leads.source, value: count() }).from(leads).where(gte(leads.createdAt, since)).groupBy(leads.source),
    db.select({ city: leads.city, value: count() }).from(leads).where(gte(leads.createdAt, since)).groupBy(leads.city),
    db.select({ day, value: count() }).from(leads).where(gte(leads.createdAt, since)).groupBy(day).orderBy(day),
    db.select({ value: count() }).from(deals),
    db.select({ value: count(), sale: sum(deals.totalSale), margin: sum(deals.expectedMargin) }).from(deals).where(eq(deals.status, 'COMPLETED')),
    db.select({ value: count() }).from(deals).where(eq(deals.status, 'LOST')),
  ]);
  const conversion = totals.value ? ((completed.value / totals.value) * 100).toFixed(1) : '0';

  return (
    <>
      <PageHeader title="Статистика" description="Заявки за последние 30 дней и итоги по сделкам." actions={
        <>
          <a href="/api/admin/export?type=leads" className="btn-outline btn-sm">Экспорт заявок (CSV)</a>
          <a href="/api/admin/export?type=deals" className="btn-outline btn-sm">Экспорт сделок</a>
          <a href="/api/admin/export?type=customers" className="btn-outline btn-sm">Экспорт клиентов</a>
        </>
      } />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Всего сделок" value={totals.value} />
        <Stat label="Завершено" value={completed.value} hint={`конверсия ${conversion}%`} />
        <Stat label="Выручка (завершённые)" value={completed.sale ? formatTenge(completed.sale) : '—'} />
        <Stat label="Отказы" value={lost.value} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Источники заявок"><Bars rows={bySource.map((r) => ({ label: SOURCE_LABELS[r.source], value: r.value })).sort((a, b) => b.value - a.value)} /></Panel>
        <Panel title="Города"><Bars rows={byCity.map((r) => ({ label: r.city ?? 'Не указан', value: r.value })).sort((a, b) => b.value - a.value)} /></Panel>
        <Panel title="По дням"><Bars rows={byDay.map((r) => ({ label: r.day, value: r.value }))} /></Panel>
      </div>
    </>
  );
}
