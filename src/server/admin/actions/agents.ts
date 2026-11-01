'use server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { agentRuns, companySettings, dealEvents, dealItems, deals, prospects } from '@/db/schema';
import { proposePrices, type PriceProposal } from '@/agents/calculator';
import { saveProspects } from '@/agents/prospects';
import { draftQuoteForDeal } from '@/agents/quotes';
import { getRun } from '@/agents/runs';
import { draftSalesReply } from '@/agents/sales';
import { prepareSupplierRequests } from '@/agents/suppliers';
import { computeMargin } from '@/lib/margin';
import { audit } from '@/server/audit';
import { requireUser } from '@/server/auth/session';

const back = (query: string) => redirect(`/admin/agents?${query}`);

async function companyName() {
  const [s] = await db.select({ name: companySettings.companyName }).from(companySettings).where(eq(companySettings.id, 1));
  return s?.name ?? 'KAZ KOMPOZIT';
}

export async function runSalesAgent(form: FormData) {
  await requireUser('crm');
  const dealId = String(form.get('dealId') ?? '');
  try {
    await draftSalesReply(dealId);
  } catch (error) {
    back(`error=${encodeURIComponent(String(error))}`);
  }
  back('ok=1&tab=sales');
}

export async function runCalculatorAgent(form: FormData) {
  await requireUser('crm');
  try {
    await proposePrices(String(form.get('dealId') ?? ''), String(form.get('markup') ?? '').replace(',', '.'));
  } catch (error) {
    back(`error=${encodeURIComponent(error instanceof Error ? error.message : String(error))}`);
  }
  back('ok=1&tab=calculator');
}

export async function runQuotesAgent(form: FormData) {
  await requireUser('crm');
  const result = await draftQuoteForDeal(String(form.get('dealId') ?? ''));
  if (!result.ok) back(`error=${encodeURIComponent(result.error)}`);
  redirect(`/admin/quotes/${result.ok ? result.id : ''}`);
}

export async function runSuppliersAgent() {
  await requireUser('suppliers');
  await prepareSupplierRequests(await companyName());
  back('ok=1&tab=suppliers');
}

export async function runProspectsAgent(form: FormData) {
  await requireUser('crm');
  const text = String(form.get('text') ?? '').slice(0, 20_000);
  const source = String(form.get('source') ?? '').trim().slice(0, 200) || 'Ручной ввод';
  await saveProspects(text, await companyName(), source);
  back('ok=1&tab=prospects');
}

export async function setProspectStatus(form: FormData) {
  const user = await requireUser('crm');
  const id = String(form.get('id'));
  const status = ['NEW', 'CONTACTED', 'REJECTED', 'CONVERTED'].find((s) => s === form.get('status')) ?? 'NEW';
  await db.update(prospects).set({ status }).where(eq(prospects.id, id));
  await audit(user.id, 'status', 'prospect', id, { status });
  revalidatePath('/admin/agents');
}

/** Подтверждение действия агента уполномоченным пользователем. */
export async function decideRun(form: FormData) {
  const user = await requireUser('quotesApprove');
  const run = await getRun(String(form.get('runId')));
  if (!run || run.status !== 'PENDING_APPROVAL') back('error=Действие уже обработано');
  const approve = form.get('decision') === 'approve';

  if (approve && run!.action === 'apply_prices') {
    const proposal = run!.output as PriceProposal;
    await db.transaction(async (tx) => {
      for (const line of proposal.lines) {
        if (!line.proposedPrice) continue;
        await tx.update(dealItems).set({ salePrice: line.proposedPrice, purchasePrice: line.purchasePrice })
          .where(and(eq(dealItems.dealId, proposal.dealId), eq(dealItems.productId, line.productId)));
      }
    });
    // Пересчёт итогов сделки по сохранённым позициям.
    const items = await db.select().from(dealItems).where(eq(dealItems.dealId, proposal.dealId));
    const totals = computeMargin(items);
    await db.update(deals).set({ totalSale: totals.totalSale, totalPurchase: totals.totalPurchase, expectedMargin: totals.margin })
      .where(eq(deals.id, proposal.dealId));
    await db.insert(dealEvents).values({
      dealId: proposal.dealId, userId: user.id, type: 'SYSTEM',
      text: `Применены цены агента-калькулятора (наценка ${proposal.markupPercent}%), подтвердил ${user.name}`,
    });
  }
  await db.update(agentRuns).set({ status: approve ? 'APPROVED' : 'REJECTED', approvedById: user.id }).where(eq(agentRuns.id, run!.id));
  await audit(user.id, approve ? 'approve' : 'reject', 'agent_run', run!.id, { action: run!.action });
  back('ok=1&tab=approvals');
}
