'use server';
import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/db/client';
import {
  customers, dealEvents, dealItems, deals, leads, quotes,
} from '@/db/schema';
import { DEAL_STATUSES, DEAL_STATUS_LABELS } from '@/lib/crm';
import { computeMargin } from '@/lib/margin';
import { isValidPhone, normalizePhone } from '@/lib/phone';
import { audit } from '@/server/audit';
import { requireUser } from '@/server/auth/session';
import { createDraftQuote } from '@/server/quotes';
import { getPurchasePriceMap } from '../purchase-prices';
import { firstError, formObject, optMoney, optStr, str } from '../form';

const dealPath = (id: string) => `/admin/deals/${id}`;

async function addEvent(dealId: string, userId: string | null, type: string, text: string) {
  await db.insert(dealEvents).values({ dealId, userId, type, text });
}

export async function updateDealStatus(form: FormData) {
  const user = await requireUser('crm');
  const id = String(form.get('dealId'));
  const status = z.enum(DEAL_STATUSES as [string, ...string[]]).parse(form.get('status')) as (typeof DEAL_STATUSES)[number];
  const lostReason = String(form.get('lostReason') ?? '').trim() || null;
  await db.update(deals).set({ status, lostReason: status === 'LOST' ? lostReason : null }).where(eq(deals.id, id));
  await addEvent(id, user.id, 'STATUS', `Статус: ${DEAL_STATUS_LABELS[status]}${status === 'LOST' && lostReason ? ` (${lostReason})` : ''}`);
  await audit(user.id, 'status', 'deal', id, { status });
  revalidatePath(dealPath(id));
  revalidatePath('/admin/deals');
}

export async function assignManager(form: FormData) {
  const user = await requireUser('crm');
  const id = String(form.get('dealId'));
  const managerId = String(form.get('managerId') ?? '') || null;
  await db.update(deals).set({ managerId }).where(eq(deals.id, id));
  await addEvent(id, user.id, 'SYSTEM', managerId ? 'Назначен ответственный менеджер' : 'Ответственный снят');
  await audit(user.id, 'assign', 'deal', id, { managerId });
  revalidatePath(dealPath(id));
}

export async function addDealNote(form: FormData) {
  const user = await requireUser('crm');
  const id = String(form.get('dealId'));
  const type = z.enum(['NOTE', 'CALL', 'WHATSAPP', 'EMAIL']).catch('NOTE').parse(form.get('type'));
  const text = String(form.get('text') ?? '').trim().slice(0, 3000);
  if (text) await addEvent(id, user.id, type, text);
  revalidatePath(dealPath(id));
}

/** Сохраняет позиции сделки и логистику, пересчитывает себестоимость и маржу. */
export async function saveDealItems(form: FormData) {
  const user = await requireUser('crm');
  const id = String(form.get('dealId'));
  const productIds = form.getAll('productId').map(String);
  const meters = form.getAll('meters').map((v) => String(v).replace(',', '.').trim());
  const salePrices = form.getAll('salePrice').map((v) => String(v).replace(',', '.').trim());
  const money = /^\d{1,10}(\.\d{1,2})?$/;

  const rows = productIds.map((productId, i) => ({ productId, meters: meters[i], salePrice: salePrices[i] || null }))
    .filter((r) => r.productId && r.meters && Number(r.meters) > 0);
  if (rows.some((r) => !money.test(r.meters) || (r.salePrice && !money.test(r.salePrice)))) {
    redirect(`${dealPath(id)}?error=Некорректные числа в позициях`);
  }

  const delivery = optMoney.safeParse(String(form.get('deliveryCost') ?? ''));
  if (!delivery.success) redirect(`${dealPath(id)}?error=Некорректная стоимость доставки`);
  const city = String(form.get('city') ?? '').trim() || null;
  const logisticsNote = String(form.get('logisticsNote') ?? '').trim().slice(0, 2000) || null;

  const purchase = await getPurchasePriceMap(rows.map((r) => r.productId));
  const lines = rows.map((r) => ({ ...r, purchasePrice: purchase.get(r.productId) ?? null }));
  const margin = computeMargin(lines);

  await db.transaction(async (tx) => {
    await tx.delete(dealItems).where(eq(dealItems.dealId, id));
    if (lines.length > 0) await tx.insert(dealItems).values(lines.map((l) => ({ dealId: id, ...l })));
    await tx.update(deals).set({
      city, logisticsNote, deliveryCost: delivery.data,
      totalSale: margin.totalSale, totalPurchase: margin.totalPurchase, expectedMargin: margin.margin,
    }).where(eq(deals.id, id));
  });
  await addEvent(id, user.id, 'SYSTEM', 'Обновлены позиции и логистика сделки');
  await audit(user.id, 'update_items', 'deal', id, { positions: lines.length });
  redirect(`${dealPath(id)}?ok=1`);
}

const manualDealSchema = z.object({
  name: str(120).min(1), phone: str(30).refine(isValidPhone, 'Некорректный телефон'),
  company: optStr(200), city: optStr(120), message: optStr(3000),
  buyerType: z.enum(['PRIVATE', 'WHOLESALE']).default('PRIVATE'),
});

export async function createManualDeal(form: FormData) {
  const user = await requireUser('crm');
  const parsed = manualDealSchema.safeParse(formObject(form));
  if (!parsed.success) redirect(`/admin/deals?error=${encodeURIComponent(firstError(parsed.error))}`);
  const data = parsed.data;
  const phone = normalizePhone(data.phone);

  const dealId = await db.transaction(async (tx) => {
    const existing = await tx.query.customers.findFirst({ where: eq(customers.phone, phone) });
    const customerId = existing?.id ?? (await tx.insert(customers).values({
      name: data.name, phone, company: data.company, city: data.city, type: data.buyerType,
    }).returning({ id: customers.id }))[0].id;
    const [lead] = await tx.insert(leads).values({
      source: 'MANUAL', customerId, city: data.city, buyerType: data.buyerType, message: data.message,
    }).returning({ id: leads.id, number: leads.number });
    const [deal] = await tx.insert(deals).values({ leadId: lead.id, customerId, city: data.city, managerId: user.id })
      .returning({ id: deals.id });
    await tx.insert(dealEvents).values({ dealId: deal.id, userId: user.id, type: 'SYSTEM', text: `Сделка создана вручную (заявка №${lead.number})` });
    return deal.id;
  });
  await audit(user.id, 'create', 'deal', dealId);
  redirect(dealPath(dealId));
}

// ───── Коммерческие предложения ─────

/** Черновик КП из позиций сделки. В КП попадают только цены продажи. */
export async function createQuote(form: FormData) {
  const user = await requireUser('crm');
  const dealId = String(form.get('dealId'));
  const result = await createDraftQuote({
    dealId, userId: user.id,
    discount: String(form.get('discount') ?? ''),
    includeDelivery: form.get('includeDelivery') === 'on',
    terms: String(form.get('terms') ?? ''),
  });
  if (!result.ok) redirect(`${dealPath(dealId)}?error=${encodeURIComponent(result.error)}`);
  await audit(user.id, 'create', 'quote', result.id, { number: result.number });
  redirect(`/admin/quotes/${result.id}`);
}

export async function approveQuote(form: FormData) {
  const user = await requireUser('quotesApprove');
  const id = String(form.get('quoteId'));
  const quote = await db.query.quotes.findFirst({ where: eq(quotes.id, id) });
  if (!quote || quote.status !== 'DRAFT') redirect(`/admin/quotes/${id}`);
  await db.update(quotes).set({ status: 'APPROVED', approvedById: user.id }).where(eq(quotes.id, id));
  await addEvent(quote.dealId, user.id, 'SYSTEM', `КП №${quote.number} утверждено`);
  await audit(user.id, 'approve', 'quote', id);
  redirect(`/admin/quotes/${id}?ok=1`);
}

export async function markQuoteSent(form: FormData) {
  const user = await requireUser('crm');
  const id = String(form.get('quoteId'));
  const channel = String(form.get('channel') ?? 'вручную');
  const quote = await db.query.quotes.findFirst({ where: eq(quotes.id, id) });
  // Отправить клиенту можно только утверждённое КП.
  if (!quote || quote.status === 'DRAFT') redirect(`/admin/quotes/${id}?error=Сначала утвердите КП`);
  await db.update(quotes).set({ status: 'SENT' }).where(eq(quotes.id, id));
  await db.update(deals).set({ status: 'QUOTE_SENT' }).where(and(eq(deals.id, quote.dealId), inArray(deals.status, ['NEW', 'CLARIFYING', 'SUPPLIER_PRICE', 'DELIVERY_CALC', 'QUOTE_READY'])));
  await addEvent(quote.dealId, user.id, 'SYSTEM', `КП №${quote.number} отправлено клиенту (${channel})`);
  await audit(user.id, 'send', 'quote', id, { channel });
  redirect(`/admin/quotes/${id}?ok=1`);
}

export async function saveCustomer(form: FormData) {
  const user = await requireUser('crm');
  const id = String(form.get('id'));
  const schema = z.object({
    name: str(120).min(1), email: optStr(160), company: optStr(200), bin: optStr(12), city: optStr(120),
    type: z.enum(['PRIVATE', 'WHOLESALE']), notes: optStr(3000),
  });
  const parsed = schema.safeParse(formObject(form));
  if (!parsed.success) redirect(`/admin/customers/${id}?error=${encodeURIComponent(firstError(parsed.error))}`);
  await db.update(customers).set(parsed.data).where(eq(customers.id, id));
  await audit(user.id, 'update', 'customer', id);
  redirect(`/admin/customers/${id}?ok=1`);
}
