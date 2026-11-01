/** Агент по поставщикам: находит устаревшие прайсы и готовит запросы на подтверждение наличия и цен. */
import 'server-only';
import { logRun } from './runs';
import { toolStaleSuppliers } from './tools';

export async function prepareSupplierRequests(companyName: string) {
  const stale = await toolStaleSuppliers('suppliers');
  const requests = stale.map((s) => ({
    supplierId: s.id,
    name: s.name,
    contact: s.phone ?? s.email ?? 'контакт не указан',
    message: `Здравствуйте${s.contactName ? `, ${s.contactName}` : ''}! Это ${companyName}. ` +
      'Просим подтвердить актуальные цены и наличие стеклокомпозитной арматуры 6, 8, 10 и 12 мм, ' +
      'форматы поставки (бухты/прутки) и сроки отгрузки. Спасибо!',
  }));
  await logRun('suppliers', 'prepare_requests', { stale: stale.length }, { requests });
  return requests;
}
