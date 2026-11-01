import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/admin/submit-button';
import { Badge, Flash, PageHeader, Panel, Table, Td } from '@/components/admin/ui';
import { db } from '@/db/client';
import { customers, deals, quotes, users } from '@/db/schema';
import { formatDate } from '@/lib/crm';
import { formatNumber, formatTenge } from '@/lib/money';
import { approveQuote, markQuoteSent } from '@/server/admin/actions/crm';
import { can, requireUser } from '@/server/auth/session';
import { whatsappConfigured } from '@/integrations/whatsapp/config';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function QuotePage({ params, searchParams }: Props) {
  const user = await requireUser('crm');
  const { id } = await params;
  const flash = await searchParams;
  const quote = await db.query.quotes.findFirst({ where: eq(quotes.id, id) });
  if (!quote) notFound();
  const deal = await db.query.deals.findFirst({ where: eq(deals.id, quote.dealId) });
  const customer = deal ? await db.query.customers.findFirst({ where: eq(customers.id, deal.customerId) }) : null;
  const approver = quote.approvedById ? await db.query.users.findFirst({ where: eq(users.id, quote.approvedById) }) : null;
  const canApprove = can(user, 'quotesApprove');

  return (
    <>
      <PageHeader
        title={`КП №${quote.number}`}
        description={`${customer?.company || customer?.name || ''} · действует до ${formatDate(quote.validUntil, false)}`}
        actions={<>
          <a href={`/api/admin/quotes/${quote.id}/pdf`} className="btn-dark btn-sm">Скачать PDF</a>
          <Link href={`/admin/deals/${quote.dealId}`} className="btn-outline btn-sm">К сделке</Link>
        </>}
      />
      <Flash {...flash} />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="Спецификация">
          <Table head={['Товар', 'Метров', 'Цена, ₸/м', 'Сумма']}>
            {quote.lines.map((l) => (
              <tr key={l.productId}><Td>{l.name}</Td><Td>{formatNumber(l.meters)}</Td><Td>{formatTenge(l.pricePerMeter)}</Td><Td className="font-semibold">{formatTenge(l.amount)}</Td></tr>
            ))}
          </Table>
          <dl className="mt-4 space-y-1 text-right text-sm">
            {quote.discount && <div>Скидка: <b>−{formatTenge(quote.discount)}</b></div>}
            <div>Доставка: <b>{quote.deliveryCost ? formatTenge(quote.deliveryCost) : 'рассчитывается отдельно'}</b></div>
            <div className="font-display text-xl font-semibold">Итого: {formatTenge(quote.total)}</div>
          </dl>
          {quote.terms && <p className="mt-4 rounded bg-graphite-50 p-3 text-sm text-graphite-600">{quote.terms}</p>}
        </Panel>
        <Panel title="Согласование">
          <div className="space-y-4 text-sm">
            <div>Статус: {quote.status === 'DRAFT' ? <Badge tone="yellow">Черновик</Badge> : quote.status === 'APPROVED' ? <Badge tone="blue">Утверждено</Badge> : <Badge tone="green">Отправлено</Badge>}</div>
            {approver && <div className="text-graphite-500">Утвердил: {approver.name}</div>}
            {quote.status === 'DRAFT' && (canApprove ? (
              <form action={approveQuote}>
                <input type="hidden" name="quoteId" value={quote.id} />
                <SubmitButton confirm="Утвердить КП? После этого его можно отправить клиенту.">Утвердить КП</SubmitButton>
              </form>
            ) : <p className="text-graphite-500">Утвердить КП может администратор или менеджер.</p>)}
            {quote.status === 'APPROVED' && (
              <form action={markQuoteSent} className="space-y-2">
                <input type="hidden" name="quoteId" value={quote.id} />
                <select name="channel" className="field"><option>WhatsApp</option><option>E-mail</option><option>Лично</option></select>
                <SubmitButton variant="dark">Отметить как отправленное</SubmitButton>
                {!whatsappConfigured && <p className="text-[11px] text-graphite-400">Автоотправка через WhatsApp Business Platform не подключена — отправьте PDF вручную.</p>}
              </form>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
