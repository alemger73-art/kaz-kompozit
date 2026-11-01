import { desc, eq } from 'drizzle-orm';
import { PageHeader, Table, Td } from '@/components/admin/ui';
import { db } from '@/db/client';
import { auditLogs, users } from '@/db/schema';
import { formatDate } from '@/lib/crm';
import { requireUser } from '@/server/auth/session';

export default async function AuditPage() {
  await requireUser('audit');
  const rows = await db.select({ id: auditLogs.id, action: auditLogs.action, entity: auditLogs.entity, entityId: auditLogs.entityId, details: auditLogs.details, createdAt: auditLogs.createdAt, user: users.name })
    .from(auditLogs).leftJoin(users, eq(users.id, auditLogs.userId)).orderBy(desc(auditLogs.createdAt)).limit(300);
  return (
    <>
      <PageHeader title="Журнал действий" description="Последние 300 действий сотрудников и агентов. Суммы закупочных цен в журнал не пишутся." />
      <Table head={['Когда', 'Кто', 'Действие', 'Объект', 'Детали']} empty={rows.length === 0}>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td className="whitespace-nowrap text-xs">{formatDate(r.createdAt)}</Td>
            <Td>{r.user ?? 'система'}</Td>
            <Td className="font-semibold">{r.action}</Td>
            <Td>{r.entity}<div className="text-[11px] text-graphite-400">{r.entityId}</div></Td>
            <Td className="max-w-md truncate font-mono text-[11px] text-graphite-500">{r.details ? JSON.stringify(r.details) : ''}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
