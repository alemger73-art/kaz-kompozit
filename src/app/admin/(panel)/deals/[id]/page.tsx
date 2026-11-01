import Link from 'next/link';
import { asc, desc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/admin/submit-button';
import { Badge, Checkbox, Field, Flash, PageHeader, Panel, Select, Table, Td, TextArea } from '@/components/admin/ui';
import { db } from '@/db/client';
import { customers, dealEvents, dealItems, deals, leads, products, quotes, users } from '@/db/schema';
import { DEAL_STATUSES, DEAL_STATUS_LABELS, DEAL_STATUS_TONE, SOURCE_LABELS, formatDate } from '@/lib/crm';
import { computeMargin } from '@/lib/margin';
import { dec, formatTenge } from '@/lib/money';
import { phoneDigits } from '@/lib/paths';
import { addDealNote, assignManager, createQuote, saveDealItems, updateDealStatus } from '@/server/admin/actions/crm';
import { requireUser } from '@/server/auth/session';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

const EVENT_LABELS: Record<string, string> = { NOTE: 'Заметка', STATUS: 'Статус', CALL: 'Звонок', WHATSAPP: 'WhatsApp', EMAIL: 'E-mail', SYSTEM: 'Система' };
const QUOTE_STATUS = { DRAFT: ['Черновик', 'yellow'], APPROVED: ['Утверждено', 'blue'], SENT: ['Отправлено', 'green'] } as const;
const EMPTY_ROWS = 3;

export default async function DealPage({ params, searchParams }: Props) {
  await requireUser('crm');
  const { id } = await params;
  const flash = await searchParams;

  const deal = await db.query.deals.findFirst({ where: eq(deals.id, id) });
  if (!deal) notFound();

  const [customer, lead, items, events, dealQuotes, productList, managers] = await Promise.all([
    db.query.customers.findFirst({ where: eq(customers.id, deal.customerId) }),
    deal.leadId ? db.query.leads.findFirst({ where: eq(leads.id, deal.leadId) }) : null,
    db.select({ productId: dealItems.productId, meters: dealItems.meters, salePrice: dealItems.salePrice, purchasePrice: dealItems.purchasePrice, name: products.nameRu })
      .from(dealItems).innerJoin(products, eq(products.id, dealItems.productId)).where(eq(dealItems.dealId, id)),
    db.select({ id: dealEvents.id, type: dealEvents.type, text: dealEvents.text, createdAt: dealEvents.createdAt, user: users.name })
      .from(dealEvents).leftJoin(users, eq(users.id, dealEvents.userId)).where(eq(dealEvents.dealId, id)).orderBy(desc(dealEvents.createdAt)),
    db.select().from(quotes).where(eq(quotes.dealId, id)).orderBy(desc(quotes.createdAt)),
    db.select({ id: products.id, nameRu: products.nameRu }).from(products).orderBy(asc(products.sort)),
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.active, true)),
  ]);
  const margin = computeMargin(items);
  const productOptions = [{ value: '', label: '— товар —' }, ...productList.map((p) => ({ value: p.id, label: p.nameRu }))];
  const payload = lead?.payload as { items?: Array<{ name: string; totalMeters: string; goodsTotal: string | null; priceIsDemo?: boolean }>; promo?: string | null } | null;
  const tel = phoneDigits(customer?.phone);

  return (
    <>
      <PageHeader
        title={`Сделка ${lead ? `№${lead.number}` : ''} · ${customer?.company || customer?.name}`}
        description={`${lead ? SOURCE_LABELS[lead.source] : 'Вручную'} · создана ${formatDate(deal.createdAt)}`}
        actions={<Badge tone={DEAL_STATUS_TONE[deal.status]}>{DEAL_STATUS_LABELS[deal.status]}</Badge>}
      />
      <Flash {...flash} />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Panel title="Товары, стоимость и логистика">
            <form action={saveDealItems} className="space-y-4">
              <input type="hidden" name="dealId" value={deal.id} />
              <Table head={['Товар', 'Метров', 'Цена продажи, ₸/м', 'Закупка, ₸/м', 'Маржа']}>
                {[...items, ...Array.from({ length: EMPTY_ROWS }, () => null)].map((item, i) => (
                  <tr key={i}>
                    <Td>
                      <select name="productId" defaultValue={item?.productId ?? ''} className="field">
                        {productOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </Td>
                    <Td><input name="meters" defaultValue={item?.meters ?? ''} inputMode="decimal" className="field w-24" /></Td>
                    <Td><input name="salePrice" defaultValue={item?.salePrice ?? ''} inputMode="decimal" className="field w-28" /></Td>
                    <Td className="text-graphite-500">{item?.purchasePrice ? formatTenge(item.purchasePrice) : '—'}</Td>
                    <Td className="font-semibold">
                      {item?.salePrice && item.purchasePrice ? formatTenge(dec(item.meters).mul(dec(item.salePrice).minus(item.purchasePrice)).toFixed(2)) : '—'}
                    </Td>
                  </tr>
                ))}
              </Table>
              <p className="text-xs text-graphite-500">Закупочная цена подставляется автоматически из раздела «Закупочные цены» при сохранении.</p>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Город доставки" name="city" defaultValue={deal.city ?? ''} />
                <Field label="Стоимость доставки, ₸" name="deliveryCost" inputMode="decimal" defaultValue={deal.deliveryCost ?? ''} hint="Пусто — не рассчитана" />
                <Field label="Логистика (заметка)" name="logisticsNote" defaultValue={deal.logisticsNote ?? ''} />
              </div>
              <SubmitButton>Сохранить и пересчитать</SubmitButton>
            </form>
            <dl className="mt-6 grid gap-3 rounded-lg bg-graphite-50 p-4 text-sm sm:grid-cols-4">
              <div><dt className="text-graphite-500">Продажа</dt><dd className="font-bold">{margin.totalSale ? formatTenge(margin.totalSale) : '—'}</dd></div>
              <div><dt className="text-graphite-500">Себестоимость</dt><dd className="font-bold">{margin.totalPurchase ? formatTenge(margin.totalPurchase) : '—'}</dd></div>
              <div><dt className="text-graphite-500">Ожидаемая маржа</dt><dd className="font-bold text-emerald-700">{margin.margin ? formatTenge(margin.margin) : '—'}</dd></div>
              <div><dt className="text-graphite-500">Маржа, %</dt><dd className="font-bold">{margin.marginPercent ? `${margin.marginPercent}%` : '—'}</dd></div>
            </dl>
          </Panel>

          <Panel title="Коммерческие предложения">
            {dealQuotes.length > 0 && (
              <ul className="mb-5 divide-y divide-graphite-100 text-sm">
                {dealQuotes.map((q) => (
                  <li key={q.id} className="flex items-center justify-between py-2">
                    <Link href={`/admin/quotes/${q.id}`} className="font-bold text-accent-600">КП №{q.number}</Link>
                    <span>{formatTenge(q.total)}</span>
                    <Badge tone={QUOTE_STATUS[q.status][1]}>{QUOTE_STATUS[q.status][0]}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <form action={createQuote} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="dealId" value={deal.id} />
              <Field label="Скидка, ₸ (сумма)" name="discount" inputMode="decimal" hint="Скидка в КП вступает в силу только после утверждения" />
              <div className="md:pt-6"><Checkbox label="Включить доставку" name="includeDelivery" defaultChecked={deal.deliveryCost !== null} hint={deal.deliveryCost ? formatTenge(deal.deliveryCost) : 'Доставка не рассчитана'} /></div>
              <TextArea className="md:col-span-2" label="Условия (по умолчанию — из настроек)" name="terms" rows={2} />
              <div><SubmitButton variant="dark">Подготовить черновик КП</SubmitButton></div>
            </form>
          </Panel>

          <Panel title="История коммуникаций">
            <form action={addDealNote} className="mb-5 flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="dealId" value={deal.id} />
              <select name="type" className="field sm:w-36">
                <option value="NOTE">Заметка</option><option value="CALL">Звонок</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">E-mail</option>
              </select>
              <input name="text" required placeholder="Что произошло…" className="field flex-1" />
              <SubmitButton variant="outline">Добавить</SubmitButton>
            </form>
            <ol className="space-y-3 border-l-2 border-graphite-100 pl-4">
              {events.map((e) => (
                <li key={e.id} className="text-sm">
                  <div className="text-[11px] text-graphite-400">{formatDate(e.createdAt)} · {EVENT_LABELS[e.type] ?? e.type}{e.user ? ` · ${e.user}` : ''}</div>
                  <div>{e.text}</div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Статус">
            <form action={updateDealStatus} className="space-y-3">
              <input type="hidden" name="dealId" value={deal.id} />
              <Select label="Этап воронки" name="status" defaultValue={deal.status} options={DEAL_STATUSES.map((s) => ({ value: s, label: DEAL_STATUS_LABELS[s] }))} />
              <Field label="Причина отказа (для «Отказ»)" name="lostReason" defaultValue={deal.lostReason ?? ''} />
              <SubmitButton variant="dark">Изменить статус</SubmitButton>
            </form>
          </Panel>
          <Panel title="Ответственный">
            <form action={assignManager} className="space-y-3">
              <input type="hidden" name="dealId" value={deal.id} />
              <Select label="Менеджер" name="managerId" defaultValue={deal.managerId ?? ''} options={[{ value: '', label: '— не назначен —' }, ...managers.map((m) => ({ value: m.id, label: m.name }))]} />
              <SubmitButton variant="outline">Назначить</SubmitButton>
            </form>
          </Panel>
          {customer && (
            <Panel title="Клиент" actions={<Link href={`/admin/customers/${customer.id}`} className="text-xs font-bold text-accent-600">Карточка →</Link>}>
              <dl className="space-y-1.5 text-sm">
                <div className="font-bold">{customer.name}</div>
                {customer.company && <div>{customer.company}{customer.bin ? `, БИН ${customer.bin}` : ''}</div>}
                <div><a href={tel ? `tel:+${tel}` : undefined} className="text-accent-600">{customer.phone}</a></div>
                {tel && <a href={`https://wa.me/${tel}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-emerald-700">Написать в WhatsApp ↗</a>}
                {customer.email && <div>{customer.email}</div>}
                <div className="text-graphite-500">{customer.type === 'WHOLESALE' ? 'Оптовый' : 'Частный'}{customer.city ? ` · ${customer.city}` : ''}</div>
              </dl>
            </Panel>
          )}
          {lead && (
            <Panel title="Исходная заявка">
              <div className="space-y-2 text-sm">
                {payload?.items?.map((i) => (
                  <div key={i.name}>{i.name}: <b>{i.totalMeters} м</b>{i.goodsTotal ? ` · ${formatTenge(i.goodsTotal)}` : ''}{i.priceIsDemo ? ' (демо-цена)' : ''}</div>
                ))}
                {payload?.promo && <div>Промокод: <b>{payload.promo}</b></div>}
                {lead.message && <p className="rounded bg-graphite-50 p-2 text-graphite-700">{lead.message}</p>}
                {lead.attachments.map((a) => <a key={a} href={a} className="block font-semibold text-accent-600">Скачать спецификацию</a>)}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
