import 'server-only';
import { db } from '@/db/client';
import { auditLogs } from '@/db/schema';

/** Запись в журнал действий. Ошибка журнала не должна ломать основное действие. */
export async function audit(
  userId: string | null, action: string, entity: string, entityId?: string | null, details?: unknown,
) {
  try {
    await db.insert(auditLogs).values({ userId, action, entity, entityId: entityId ?? null, details: details ?? null });
  } catch (error) {
    console.error('Не удалось записать журнал действий', error);
  }
}
