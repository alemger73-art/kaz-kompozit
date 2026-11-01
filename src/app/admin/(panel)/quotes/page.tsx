import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { Badge, PageHeader, Table, Td } from '@/components/admin/ui';
import { db } from '@/db/client';
import { customers, deals, quotes } from '@/db/schema';
import { formatDate } from '@/lib/crm';
import { formatTenge } from '@/lib/money';
import { requireUser } from '@/server/auth/session';

const STATUS = { DRAFT: ['Черновик — ждёт утверждения', 'yellow'], APPROVED: ['Утверждено', 'blue'], SENT: ['Отправлено', 'green'] } as const;

export default async function QuotesPage() {
  await requireUser('crm');
  const rows = await db.select({ id: quotes.id, number: quotes.number, status: quotes.status, total: quotes.total, createdAt: quotes.createdAt, validUntil: quotes.validUntil, client: customers.name, company: customers.company })
    .from(quotes).innerJoin(deals, eq(deals.id, quotes.dealId)).innerJoin(customers, eq(customers.id, deals.customerId)).orderBy(desc(quotes.createdAt)).limit(300);
  return (
    <>
      <PageHeader title="Коммерческие предложения" description="КП создаются из сделки. Клиенту отправляется только утверждённое КП." />
      <Table head={['№', 'Клиент', 'Сумма', 'Статус', 'Создано', 'Действует до', 'PDF']} empty={rows.length === 0}>
        {rows.map((q) => (
          <tr key={q.id}>
            <Td><Link href={`/admin/quotes/${q.id}`} className="font-bold text-accent-600">{q.number}</Link></Td>
            <Td>{q.company || q.client}</Td><Td>{formatTenge(q.total)}</Td>
            <Td><Badge tone={STATUS[q.status][1]}>{STATUS[q.status][0]}</Badge></Td>
            <Td className="text-xs">{formatDate(q.createdAt)}</Td><Td className="text-xs">{formatDate(q.validUntil, false)}</Td>
            <Td><a href={`/api/admin/quotes/${q.id}/pdf`} className="text-xs font-bold text-accent-600">Скачать</a></Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
