/** Журнал запусков агентов и очередь действий, требующих подтверждения человеком. */
import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { agentRuns } from '@/db/schema';

export type AgentName = 'sales' | 'calculator' | 'quotes' | 'prospects' | 'suppliers';

export const AGENT_LABELS: Record<AgentName, string> = {
  sales: 'Агент-продавец',
  calculator: 'Агент-калькулятор',
  quotes: 'Агент по КП',
  prospects: 'Агент по поиску клиентов',
  suppliers: 'Агент по поставщикам',
};

export async function logRun(agent: AgentName, action: string, input: unknown, output: unknown, pending = false) {
  const [run] = await db.insert(agentRuns).values({
    agent, action, input: input as object, output: output as object, status: pending ? 'PENDING_APPROVAL' : 'DONE',
  }).returning({ id: agentRuns.id });
  return run.id;
}

export async function failRun(agent: AgentName, action: string, input: unknown, error: unknown) {
  await db.insert(agentRuns).values({ agent, action, input: input as object, output: { error: String(error) }, status: 'FAILED' });
}

export async function getRun(id: string) {
  return db.query.agentRuns.findFirst({ where: eq(agentRuns.id, id) });
}
