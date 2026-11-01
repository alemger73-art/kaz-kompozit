import Link from 'next/link';
import { and, count, desc, eq, gte, inArray, sum } from 'drizzle-orm';
import { Badge, PageHeader, Panel, Stat, Table, Td } from '@/components/admin/ui';
import { db } from '@/db/client';
import { agentRuns, customers, deals, leads, quotes } from '@/db/schema';
import { DEAL_STATUSES, DEAL_STATUS_LABELS, DEAL_STATUS_TONE, OPEN_STATUSES, SOURCE_LABELS, formatDate } from '@/lib/crm';
import { formatTenge } from '@/lib/money';
import { can, requireUser } from '@/server/auth/session';

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireUser('dashboard');
  const { denied } = await searchParams;
  const showSales = can(user, 'crm');
  const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [byStatus, [leads30], [pipeline], [pendingQuotes], [pendingAgents], recent] = showSales
    ? await Promise.all([
        db.select({ status: deals.status, value: count() }).from(deals).groupBy(deals.status),
        db.select({ value: count() }).from(leads).where(gte(leads.createdAt, monthAgo)),
        db.select({ sale: sum(deals.totalSale), margin: sum(deals.expectedMargin) }).from(deals).where(inArray(deals.status, OPEN_STATUSES)),
        db.select({ value: count() }).from(quotes).where(eq(quotes.status, 'DRAFT')),
        db.select({ value: count() }).from(agentRuns).where(eq(agentRuns.status, 'PENDING_APPROVAL')),
        db.select({ id: deals.id, status: deals.status, city: deals.city, total: deals.totalSale, createdAt: deals.createdAt, name: customers.name, number: leads.number, source: leads.source })
          .from(deals).innerJoin(customers, eq(customers.id, deals.customerId)).leftJoin(leads, eq(leads.id, deals.leadId))
          .where(and(inArray(deals.status, OPEN_STATUSES))).orderBy(desc(deals.createdAt)).limit(8),
      ])
    : [[], [{ value: 0 }], [{ sale: null, margin: null }], [{ value: 0 }], [{ value: 0 }], []];

  const statusCount = (status: string) => byStatus.find((s) => s.status === status)?.value ?? 0;
  const maxCount = Math.max(1, ...byStatus.map((s) => s.value));

  return (
    <>
      <PageHeader title="Главная панель" description={`Здравствуйте, ${user.name}`} />
      {denied && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">Недостаточно прав для этого раздела.</p>}
      {!showSales ? (
        <Panel title="Быстрые действия">
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/products" className="btn-outline btn-sm">Товары</Link>
            <Link href="/admin/projects" className="btn-outline btn-sm">Проекты</Link>
            <Link href="/admin/seo" className="btn-outline btn-sm">SEO</Link>
          </div>
        </Panel>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Новые заявки" value={statusCount('NEW')} hint="ожидают обработки" />
            <Stat label="Заявок за 30 дней" value={leads30.value} />
            <Stat label="В работе (сумма)" value={pipeline.sale ? formatTenge(pipeline.sale) : '—'} />
            <Stat label="Ожидаемая маржа" value={pipeline.margin ? formatTenge(pipeline.margin) : '—'} hint="по открытым сделкам" />
            <Stat label="Ждут подтверждения" value={pendingQuotes.value + pendingAgents.value} hint="КП и действия агентов" />
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <Panel title="Воронка">
              <ul className="space-y-2">
                {DEAL_STATUSES.map((status) => (
                  <li key={status}>
                    <Link href={`/admin/deals?status=${status}`} className="group grid grid-cols-[150px_1fr_32px] items-center gap-3 text-sm">
                      <span className="truncate text-graphite-600 group-hover:text-graphite-950">{DEAL_STATUS_LABELS[status]}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-graphite-100">
                        <span className="block h-full rounded-full bg-accent-500" style={{ width: `${(statusCount(status) / maxCount) * 100}%` }} />
                      </span>
                      <span className="text-right font-bold">{statusCount(status)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Последние открытые сделки" actions={<Link href="/admin/deals" className="text-xs font-bold text-accent-600">Все →</Link>}>
              <Table head={['№', 'Клиент', 'Источник', 'Статус', 'Сумма']} empty={recent.length === 0}>
                {recent.map((d) => (
                  <tr key={d.id} className="hover:bg-graphite-50">
                    <Td><Link href={`/admin/deals/${d.id}`} className="font-bold text-accent-600">{d.number ?? '—'}</Link><div className="text-[11px] text-graphite-400">{formatDate(d.createdAt)}</div></Td>
                    <Td>{d.name}<div className="text-[11px] text-graphite-400">{d.city ?? ''}</div></Td>
                    <Td>{d.source ? SOURCE_LABELS[d.source] : 'Вручную'}</Td>
                    <Td><Badge tone={DEAL_STATUS_TONE[d.status]}>{DEAL_STATUS_LABELS[d.status]}</Badge></Td>
                    <Td>{d.total ? formatTenge(d.total) : '—'}</Td>
                  </tr>
                ))}
              </Table>
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
