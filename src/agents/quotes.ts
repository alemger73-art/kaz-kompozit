/** Агент по КП: готовит черновик. Утверждение и отправка — только человеком. */
import 'server-only';
import { createDraftQuote } from '@/server/quotes';
import { failRun, logRun } from './runs';
import { assertToolAllowed } from './tools';

export async function draftQuoteForDeal(dealId: string) {
  assertToolAllowed('quotes', 'quote.draft');
  const result = await createDraftQuote({ dealId, userId: null, author: 'агент по КП', includeDelivery: true });
  if (!result.ok) {
    await failRun('quotes', 'draft_quote', { dealId }, result.error);
    return result;
  }
  await logRun('quotes', 'draft_quote', { dealId }, { quoteId: result.id, number: result.number });
  return result;
}
