import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/admin/submit-button';
import { Badge, Field, Flash, PageHeader, Panel, Select, TextArea } from '@/components/admin/ui';
import { db } from '@/db/client';
import { customers, deals } from '@/db/schema';
import { DEAL_STATUS_LABELS, DEAL_STATUS_TONE, formatDate } from '@/lib/crm';
import { formatTenge } from '@/lib/money';
import { saveCustomer } from '@/server/admin/actions/crm';
import { requireUser } from '@/server/auth/session';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function CustomerPage({ params, searchParams }: Props) {
  await requireUser('crm');
  const { id } = await params;
  const flash = await searchParams;
  const customer = await db.query.customers.findFirst({ where: eq(customers.id, id) });
  if (!customer) notFound();
  const history = await db.select().from(deals).where(eq(deals.customerId, id)).orderBy(desc(deals.createdAt));

  return (
    <>
      <PageHeader title={customer.company || customer.name} description={customer.phone} />
      <Flash {...flash} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Данные клиента">
          <form action={saveCustomer} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={customer.id} />
            <Field label="Имя" name="name" required defaultValue={customer.name} />
            <Field label="E-mail" name="email" type="email" defaultValue={customer.email ?? ''} />
            <Field label="Компания" name="company" defaultValue={customer.company ?? ''} />
            <Field label="БИН" name="bin" defaultValue={customer.bin ?? ''} />
            <Field label="Город" name="city" defaultValue={customer.city ?? ''} />
            <Select label="Тип" name="type" defaultValue={customer.type} options={[{ value: 'PRIVATE', label: 'Частный' }, { value: 'WHOLESALE', label: 'Оптовый' }]} />
            <TextArea className="sm:col-span-2" label="Заметки" name="notes" defaultValue={customer.notes ?? ''} />
            <div><SubmitButton>Сохранить</SubmitButton></div>
          </form>
        </Panel>
        <Panel title="История сделок">
          <ul className="divide-y divide-graphite-100 text-sm">
            {history.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/admin/deals/${d.id}`} className="font-semibold text-accent-600">{formatDate(d.createdAt, false)}</Link>
                <span>{d.totalSale ? formatTenge(d.totalSale) : '—'}</span>
                <Badge tone={DEAL_STATUS_TONE[d.status]}>{DEAL_STATUS_LABELS[d.status]}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
