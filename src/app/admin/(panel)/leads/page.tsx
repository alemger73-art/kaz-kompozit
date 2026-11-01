import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { Badge, PageHeader, Table, Td } from '@/components/admin/ui';
import { db } from '@/db/client';
import { customers, deals, leads, leadSourceEnum } from '@/db/schema';
import { DEAL_STATUS_LABELS, DEAL_STATUS_TONE, SOURCE_LABELS, formatDate } from '@/lib/crm';
import { requireUser } from '@/server/auth/session';

type Props = { searchParams: Promise<{ source?: string }> };
type LeadPayload = { items?: Array<{ name: string; totalMeters: string }>; specLines?: number } | null;

export default async function LeadsPage({ searchParams }: Props) {
  await requireUser('crm');
  const { source } = await searchParams;
  const validSource = leadSourceEnum.enumValues.find((s) => s === source);

  const rows = await db.select({
    id: leads.id, number: leads.number, source: leads.source, city: leads.city, buyerType: leads.buyerType,
    message: leads.message, payload: leads.payload, attachments: leads.attachments, createdAt: leads.createdAt, locale: leads.locale,
    name: customers.name, phone: customers.phone, company: customers.company, dealId: deals.id, status: deals.status,
  }).from(leads).innerJoin(customers, eq(customers.id, leads.customerId)).leftJoin(deals, eq(deals.leadId, leads.id))
    .where(validSource ? eq(leads.source, validSource) : undefined).orderBy(desc(leads.createdAt)).limit(200);

  return (
    <>
      <PageHeader title="Заявки" description="Каждая заявка автоматически создаёт сделку в CRM." />
      <div className="mb-4 flex flex-wrap gap-1.5 text-xs">
        <Link href="/admin/leads" className={`rounded-full border px-3 py-1 font-bold ${!validSource ? 'border-graphite-900 bg-graphite-900 text-white' : 'border-graphite-200 bg-white'}`}>Все</Link>
        {leadSourceEnum.enumValues.map((s) => (
          <Link key={s} href={`/admin/leads?source=${s}`} className={`rounded-full border px-3 py-1 font-bold ${validSource === s ? 'border-accent-500 bg-accent-500 text-white' : 'border-graphite-200 bg-white'}`}>{SOURCE_LABELS[s]}</Link>
        ))}
      </div>
      <Table head={['№ / дата', 'Клиент', 'Источник', 'Состав', 'Сделка']} empty={rows.length === 0}>
        {rows.map((l) => {
          const payload = l.payload as LeadPayload;
          return (
            <tr key={l.id}>
              <Td><b>{l.number}</b><div className="text-[11px] text-graphite-400">{formatDate(l.createdAt)} · {l.locale.toUpperCase()}</div></Td>
              <Td>{l.name}<div className="text-[11px] text-graphite-500">{l.phone}{l.company ? ` · ${l.company}` : ''}</div></Td>
              <Td>{SOURCE_LABELS[l.source]}<div className="text-[11px] text-graphite-400">{l.buyerType === 'WHOLESALE' ? 'Опт' : 'Частный'}{l.city ? ` · ${l.city}` : ''}</div></Td>
              <Td className="max-w-xs text-xs">
                {payload?.items?.map((i) => <div key={i.name}>{i.name}: {i.totalMeters} м</div>)}
                {l.message && <div className="mt-1 text-graphite-500">«{l.message.slice(0, 140)}»</div>}
                {l.attachments.map((a) => <a key={a} href={a} className="block font-semibold text-accent-600">Файл спецификации</a>)}
              </Td>
              <Td>{l.dealId && l.status ? <Link href={`/admin/deals/${l.dealId}`}><Badge tone={DEAL_STATUS_TONE[l.status]}>{DEAL_STATUS_LABELS[l.status]}</Badge></Link> : '—'}</Td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
