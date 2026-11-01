import Link from 'next/link';
import { desc, eq, inArray } from 'drizzle-orm';
import { SubmitButton } from '@/components/admin/submit-button';
import { Badge, Field, Flash, NotConnected, PageHeader, Panel, Select, Table, Td, TextArea } from '@/components/admin/ui';
import { db } from '@/db/client';
import { agentRuns, customers, deals, leads, prospects } from '@/db/schema';
import { llmStatus } from '@/agents/llm';
import { AGENT_LABELS, type AgentName } from '@/agents/runs';
import { TOOL_REGISTRY } from '@/agents/tools';
import type { PriceProposal } from '@/agents/calculator';
import { OPEN_STATUSES, formatDate } from '@/lib/crm';
import { formatNumber, formatTenge } from '@/lib/money';
import {
  decideRun, runCalculatorAgent, runProspectsAgent, runQuotesAgent, runSalesAgent, runSuppliersAgent, setProspectStatus,
} from '@/server/admin/actions/agents';
import { can, requireUser } from '@/server/auth/session';

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };
type Run = typeof agentRuns.$inferSelect;

const PROSPECT_STATUS = [
  { value: 'NEW', label: 'Новый' }, { value: 'CONTACTED', label: 'Связались' },
  { value: 'CONVERTED', label: 'Стал клиентом' }, { value: 'REJECTED', label: 'Отказ' },
];

function lastRun(runs: Run[], agent: AgentName) {
  return runs.find((r) => r.agent === agent);
}

function ProposalTable({ proposal }: { proposal: PriceProposal }) {
  return (
    <div className="mt-3 space-y-2 text-sm">
      <Table head={['Позиция', 'Метров', 'Закупка', 'Предложенная цена', 'Сумма']}>
        {proposal.lines.map((l) => (
          <tr key={l.productId}>
            <Td>{l.name}</Td><Td>{formatNumber(l.meters)}</Td>
            <Td>{l.purchasePrice ? formatTenge(l.purchasePrice) : <Badge tone="red">нет данных</Badge>}</Td>
            <Td className="font-semibold">{l.proposedPrice ? formatTenge(l.proposedPrice) : '—'}</Td>
            <Td>{l.amount ? formatTenge(l.amount) : '—'}</Td>
          </tr>
        ))}
      </Table>
      <p>Итого: <b>{proposal.totalSale ? formatTenge(proposal.totalSale) : '—'}</b> · маржа <b>{proposal.margin ? formatTenge(proposal.margin) : '—'}</b> {proposal.marginPercent && `(${proposal.marginPercent}%)`}</p>
      {proposal.missingCosts.length > 0 && <p className="text-red-700">Нет закупочной цены: {proposal.missingCosts.join(', ')} — применить нельзя.</p>}
    </div>
  );
}

export default async function AgentsPage({ searchParams }: Props) {
  const user = await requireUser('integrations');
  const flash = await searchParams;
  const llm = llmStatus();

  const [openDeals, runs, prospectList] = await Promise.all([
    db.select({ id: deals.id, number: leads.number, name: customers.name, company: customers.company })
      .from(deals).innerJoin(customers, eq(customers.id, deals.customerId)).leftJoin(leads, eq(leads.id, deals.leadId))
      .where(inArray(deals.status, OPEN_STATUSES)).orderBy(desc(deals.createdAt)).limit(100),
    db.select().from(agentRuns).orderBy(desc(agentRuns.createdAt)).limit(50),
    db.select().from(prospects).orderBy(desc(prospects.createdAt)).limit(50),
  ]);
  const dealOptions = openDeals.map((d) => ({ value: d.id, label: `№${d.number ?? '—'} · ${d.company || d.name}` }));
  const pending = runs.filter((r) => r.status === 'PENDING_APPROVAL');
  const canDecide = can(user, 'quotesApprove');
  const sales = lastRun(runs, 'sales');
  const calc = lastRun(runs, 'calculator');
  const suppliersRun = lastRun(runs, 'suppliers');
  const noDeals = dealOptions.length === 0;
  const salesOutput = sales?.output as { text?: string; error?: string; provider?: string } | null | undefined;
  const calcProposal = calc?.action === 'apply_prices' ? (calc.output as PriceProposal | null) : null;
  type SupplierRequest = { supplierId: string; name: string; contact: string; message: string };
  const supplierRequests = (suppliersRun?.output as { requests?: SupplierRequest[] } | null | undefined)?.requests ?? [];

  return (
    <>
      <PageHeader title="ИИ-агенты" description="Агенты работают через контролируемые инструменты. Деньги считает код, а не модель. Окончательные КП, скидки и цены — только после подтверждения человеком." />
      <Flash {...flash} />
      <div className="space-y-6">
        {llm.connected ? (
          <Panel title="Языковая модель"><Badge tone="green">Подключено</Badge> <span className="ml-2 text-sm">{llm.name} · {llm.model}</span></Panel>
        ) : (
          <NotConnected title="Языковая модель">
            Агенты работают на шаблонах. Для подключения задайте LLM_API_KEY и LLM_MODEL
            (и при необходимости LLM_PROVIDER=openai-compatible с LLM_BASE_URL).
          </NotConnected>
        )}

        {pending.length > 0 && (
          <Panel title={`Ждут подтверждения (${pending.length})`}>
            <div className="space-y-4">
              {pending.map((run) => (
                <div key={run.id} className="rounded-lg border border-fiber-500 p-4">
                  <div className="text-sm font-bold">{AGENT_LABELS[run.agent as AgentName]} · {formatDate(run.createdAt)}</div>
                  {run.action === 'apply_prices' && <ProposalTable proposal={run.output as PriceProposal} />}
                  {canDecide ? (
                    <form action={decideRun} className="mt-3 flex gap-2">
                      <input type="hidden" name="runId" value={run.id} />
                      <SubmitButton name="decision" value="approve" confirm="Применить цены к сделке?">Подтвердить</SubmitButton>
                      <SubmitButton name="decision" value="reject" variant="danger">Отклонить</SubmitButton>
                    </form>
                  ) : <p className="mt-2 text-xs text-graphite-500">Подтвердить может администратор или менеджер.</p>}
                </div>
              ))}
            </div>
          </Panel>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title={AGENT_LABELS.sales}>
            <p className="mb-3 text-sm text-graphite-500">Готовит черновик ответа клиенту по данным сделки и каталога. Отправляет менеджер.</p>
            <form action={runSalesAgent} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Select className="flex-1" label="Сделка" name="dealId" options={dealOptions} disabled={noDeals} />
              <SubmitButton variant="dark">Подготовить ответ</SubmitButton>
            </form>
            {sales && salesOutput && (
              <div className="mt-4">
                <div className="text-[11px] text-graphite-400">Последний черновик · {formatDate(sales.createdAt)} · {salesOutput.provider}</div>
                <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-graphite-50 p-3 font-sans text-sm">{salesOutput.text ?? salesOutput.error}</pre>
              </div>
            )}
          </Panel>

          <Panel title={AGENT_LABELS.calculator}>
            <p className="mb-3 text-sm text-graphite-500">Считает цену продажи от закупки с заданной наценкой и маржу сделки. Запись цен — после подтверждения.</p>
            <form action={runCalculatorAgent} className="grid gap-2 sm:grid-cols-[1fr_120px_auto] sm:items-end">
              <Select label="Сделка" name="dealId" options={dealOptions} disabled={noDeals} />
              <Field label="Наценка, %" name="markup" defaultValue="35" inputMode="decimal" />
              <SubmitButton variant="dark">Рассчитать</SubmitButton>
            </form>
            {calcProposal && <ProposalTable proposal={calcProposal} />}
          </Panel>

          <Panel title={AGENT_LABELS.quotes}>
            <p className="mb-3 text-sm text-graphite-500">Создаёт черновик КП с логотипом, спецификацией и условиями. Отправить клиенту можно только после утверждения.</p>
            <form action={runQuotesAgent} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Select className="flex-1" label="Сделка" name="dealId" options={dealOptions} disabled={noDeals} />
              <SubmitButton variant="dark">Подготовить черновик КП</SubmitButton>
            </form>
          </Panel>

          <Panel title={AGENT_LABELS.suppliers}>
            <p className="mb-3 text-sm text-graphite-500">Находит поставщиков с прайсом старше 30 дней и готовит запросы на подтверждение цен и наличия.</p>
            <form action={runSuppliersAgent}><SubmitButton variant="dark">Проверить прайсы</SubmitButton></form>
            {supplierRequests.length > 0 && (
              <ul className="mt-4 space-y-3 text-sm">
                {supplierRequests.map((r) => (
                  <li key={r.supplierId} className="rounded-lg bg-graphite-50 p-3">
                    <div className="font-bold">{r.name} <span className="font-normal text-graphite-500">· {r.contact}</span></div>
                    <p className="mt-1">{r.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title={AGENT_LABELS.prospects}>
          <p className="mb-3 text-sm text-graphite-500">
            Вставьте найденные в открытых источниках компании (закупки, каталоги, сайты) — по одной в строке:
            <code className="mx-1 rounded bg-graphite-100 px-1">Название; Город; Ссылка; Заметка</code>.
            Агент оформит карточки и персональные черновики. Массовые рассылки не выполняются — пишите каждому вручную.
          </p>
          <form action={runProspectsAgent} className="grid gap-3 md:grid-cols-[1fr_220px]">
            <TextArea label="Компании" name="text" rows={4} required placeholder="ТОО «Пример»; Астана; https://...; строят склад" />
            <div className="space-y-3">
              <Field label="Источник" name="source" placeholder="Портал госзакупок" />
              <SubmitButton variant="dark">Оформить карточки</SubmitButton>
            </div>
          </form>
          {prospectList.length > 0 && (
            <div className="mt-5">
              <Table head={['Компания', 'Источник', 'Черновик обращения', 'Статус']}>
                {prospectList.map((p) => (
                  <tr key={p.id}>
                    <Td><b>{p.name}</b><div className="text-[11px] text-graphite-400">{p.city}</div>{p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent-600">ссылка</a>}</Td>
                    <Td className="text-xs">{p.source}{p.notes && <div className="text-graphite-400">{p.notes}</div>}</Td>
                    <Td className="max-w-md text-xs">{p.draftMessage}</Td>
                    <Td>
                      <form action={setProspectStatus} className="flex gap-1">
                        <input type="hidden" name="id" value={p.id} />
                        <select name="status" defaultValue={p.status} className="field py-1 text-xs">{PROSPECT_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
                        <SubmitButton variant="outline">OK</SubmitButton>
                      </form>
                    </Td>
                  </tr>
                ))}
              </Table>
            </div>
          )}
        </Panel>

        <Panel title="Инструменты и права агентов">
          <Table head={['Инструмент', 'Назначение', 'Агенты', 'Подтверждение']}>
            {Object.entries(TOOL_REGISTRY).map(([name, spec]) => (
              <tr key={name}>
                <Td className="font-mono text-xs">{name}</Td><Td>{spec.description}</Td>
                <Td className="text-xs">{spec.agents.map((a) => AGENT_LABELS[a]).join(', ')}</Td>
                <Td>{spec.requiresApproval ? <Badge tone="orange">Требуется</Badge> : <Badge>Нет</Badge>}</Td>
              </tr>
            ))}
          </Table>
        </Panel>

        <Panel title="Журнал запусков">
          <Table head={['Когда', 'Агент', 'Действие', 'Статус']} empty={runs.length === 0}>
            {runs.slice(0, 20).map((r) => (
              <tr key={r.id}>
                <Td className="text-xs">{formatDate(r.createdAt)}</Td><Td>{AGENT_LABELS[r.agent as AgentName] ?? r.agent}</Td><Td>{r.action}</Td>
                <Td><Badge tone={r.status === 'FAILED' || r.status === 'REJECTED' ? 'red' : r.status === 'PENDING_APPROVAL' ? 'yellow' : 'green'}>{r.status}</Badge></Td>
              </tr>
            ))}
          </Table>
          {noDeals && <p className="mt-3 text-xs text-graphite-500">Нет открытых сделок — агентам по продажам пока не с чем работать. <Link href="/admin/deals" className="text-accent-600">Создать сделку</Link></p>}
        </Panel>
      </div>
    </>
  );
}
