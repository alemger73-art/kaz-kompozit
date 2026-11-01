import Link from 'next/link';
import { count, desc, eq, ilike, or } from 'drizzle-orm';
import { Badge, PageHeader, Table, Td } from '@/components/admin/ui';
import { db } from '@/db/client';
import { customers, deals } from '@/db/schema';
import { formatDate } from '@/lib/crm';
import { requireUser } from '@/server/auth/session';

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser('crm');
  const { q } = await searchParams;
  const query = q?.trim().slice(0, 100);
  const rows = await db.select({
    id: customers.id, name: customers.name, phone: customers.phone, company: customers.company, city: customers.city,
    type: customers.type, createdAt: customers.createdAt, deals: count(deals.id),
  }).from(customers).leftJoin(deals, eq(deals.customerId, customers.id))
    .where(query ? or(ilike(customers.name, `%${query}%`), ilike(customers.phone, `%${query}%`), ilike(customers.company, `%${query}%`)) : undefined)
    .groupBy(customers.id).orderBy(desc(customers.createdAt)).limit(300);

  return (
    <>
      <PageHeader title="Клиенты" actions={
        <form className="flex gap-2"><input name="q" defaultValue={query} placeholder="Имя, телефон, компания" className="field w-64" /><button className="btn-outline btn-sm">Найти</button></form>
      } />
      <Table head={['Клиент', 'Телефон', 'Компания', 'Город', 'Тип', 'Сделок', 'Создан']} empty={rows.length === 0}>
        {rows.map((c) => (
          <tr key={c.id}>
            <Td><Link href={`/admin/customers/${c.id}`} className="font-bold hover:text-accent-600">{c.name}</Link></Td>
            <Td>{c.phone}</Td><Td>{c.company ?? '—'}</Td><Td>{c.city ?? '—'}</Td>
            <Td>{c.type === 'WHOLESALE' ? <Badge tone="orange">Опт</Badge> : <Badge>Частный</Badge>}</Td>
            <Td>{c.deals}</Td><Td className="text-xs">{formatDate(c.createdAt, false)}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
