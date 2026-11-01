import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { SubmitButton } from '@/components/admin/submit-button';
import { Field, Flash, PageHeader, Panel, Select } from '@/components/admin/ui';
import { db } from '@/db/client';
import { customers, deals, leads, users } from '@/db/schema';
import { DEAL_STATUSES, DEAL_STATUS_LABELS, SOURCE_LABELS, formatDate } from '@/lib/crm';
import { formatTenge } from '@/lib/money';
import { createManualDeal } from '@/server/admin/actions/crm';
import { requireUser } from '@/server/auth/session';

type Props = { searchParams: Promise<{ status?: string; mine?: string; error?: string }> };

export default async function DealsPage({ searchParams }: Props) {
  const user = await requireUser('crm');
  const params = await searchParams;
  const rows = await db.select({
    id: deals.id, status: deals.status, city: deals.city, totalSale: deals.totalSale, margin: deals.expectedMargin,
    createdAt: deals.createdAt, managerId: deals.managerId, name: customers.name, company: customers.company,
    number: leads.number, source: leads.source, manager: users.name,
  }).from(deals).innerJoin(customers, eq(customers.id, deals.customerId)).leftJoin(leads, eq(leads.id, deals.leadId))
    .leftJoin(users, eq(users.id, deals.managerId)).orderBy(desc(deals.createdAt)).limit(500);

  const filtered = rows.filter((d) => (!params.mine || d.managerId === user.id));
  const columns = params.status ? DEAL_STATUSES.filter((s) => s === params.status) : DEAL_STATUSES;

  return (
    <>
      <PageHeader
        title="Сделки (CRM)"
        description="Воронка продаж. Нажмите на карточку, чтобы открыть сделку."
        actions={
          <div className="flex gap-2 text-xs font-bold">
            <Link href="/admin/deals" className={`btn-sm ${!params.mine && !params.status ? 'btn-dark' : 'btn-outline'}`}>Все</Link>
            <Link href="/admin/deals?mine=1" className={`btn-sm ${params.mine ? 'btn-dark' : 'btn-outline'}`}>Мои</Link>
          </div>
        }
      />
      <Flash error={params.error} />
      <div className="-mx-4 overflow-x-auto px-4 pb-4">
        <div className="flex gap-3" style={{ minWidth: columns.length > 1 ? `${columns.length * 250}px` : undefined }}>
          {columns.map((status) => {
            const items = filtered.filter((d) => d.status === status);
            return (
              <section key={status} className="w-[250px] shrink-0 rounded-xl bg-graphite-100 p-2">
                <header className="flex items-center justify-between px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-graphite-600">
                  <Link href={`/admin/deals?status=${status}`}>{DEAL_STATUS_LABELS[status]}</Link>
                  <span>{items.length}</span>
                </header>
                <div className="space-y-2">
                  {items.map((d) => (
                    <Link key={d.id} href={`/admin/deals/${d.id}`} className="block rounded-lg border border-graphite-200 bg-white p-3 text-sm transition hover:border-accent-500">
                      <div className="flex justify-between text-[11px] text-graphite-400"><span>№{d.number ?? '—'}</span><span>{formatDate(d.createdAt, false)}</span></div>
                      <div className="mt-1 font-bold">{d.company || d.name}</div>
                      <div className="text-xs text-graphite-500">{d.source ? SOURCE_LABELS[d.source] : ''}{d.city ? ` · ${d.city}` : ''}</div>
                      <div className="mt-2 flex justify-between text-xs">
                        <span className="font-semibold">{d.totalSale ? formatTenge(d.totalSale) : '—'}</span>
                        {d.margin && <span className="text-emerald-700">+{formatTenge(d.margin)}</span>}
                      </div>
                      {d.manager && <div className="mt-1 text-[11px] text-graphite-400">{d.manager}</div>}
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
      <Panel title="Новая сделка вручную" className="mt-6">
        <form action={createManualDeal} className="grid gap-3 md:grid-cols-3">
          <Field label="Имя клиента" name="name" required />
          <Field label="Телефон" name="phone" required />
          <Field label="Компания" name="company" />
          <Field label="Город" name="city" />
          <Select label="Тип" name="buyerType" options={[{ value: 'PRIVATE', label: 'Частный' }, { value: 'WHOLESALE', label: 'Оптовый' }]} />
          <Field label="Комментарий" name="message" />
          <div><SubmitButton>Создать сделку</SubmitButton></div>
        </form>
      </Panel>
    </>
  );
}
