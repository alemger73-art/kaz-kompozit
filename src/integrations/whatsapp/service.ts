/** Обработка входящих сообщений WhatsApp: диалог бота, заявка в CRM, передача человеку. */
import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { companySettings, deliveryCities, products, waConversations, waMessages, type WaState } from '@/db/schema';
import { normalizePhone } from '@/lib/phone';
import { createLead } from '@/server/leads';
import { notifyManagers } from '@/server/notify';
import { nextStep, type BotContext } from './bot';
import { whatsappConfigured, whatsappEnv } from './config';

async function botContext(): Promise<BotContext> {
  const [settings] = await db.select({ name: companySettings.companyName }).from(companySettings).where(eq(companySettings.id, 1));
  const [productRows, cityRows] = await Promise.all([
    db.select({ id: products.id, name: products.nameRu, diameterMm: products.diameterMm }).from(products)
      .where(eq(products.published, true)).orderBy(asc(products.sort)),
    db.select({ slug: deliveryCities.slug, name: deliveryCities.nameRu }).from(deliveryCities)
      .where(eq(deliveryCities.active, true)).orderBy(asc(deliveryCities.sort)),
  ]);
  return {
    companyName: settings?.name ?? 'KAZ KOMPOZIT',
    products: productRows.map((p) => ({ ...p, diameterMm: p.diameterMm ? Number(p.diameterMm) : null })),
    cities: cityRows,
  };
}

/** Отправка текста через Cloud API. В тестовом режиме — только запись в БД. */
export async function sendWhatsappText(conversationId: string, to: string, text: string): Promise<void> {
  if (whatsappConfigured) {
    const response = await fetch(`https://graph.facebook.com/${whatsappEnv.apiVersion}/${whatsappEnv.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${whatsappEnv.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: to.replace(/\D/g, ''), type: 'text', text: { body: text } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) console.error('WhatsApp API ответил ошибкой', response.status, await response.text());
  }
  await db.insert(waMessages).values({ conversationId, direction: 'OUT', text, testMode: !whatsappConfigured });
}

export async function handleIncomingMessage(rawPhone: string, text: string): Promise<string[]> {
  const phone = normalizePhone(rawPhone);
  const [conversation] = await db.insert(waConversations).values({ phone })
    .onConflictDoUpdate({ target: waConversations.phone, set: { updatedAt: new Date() } }).returning();
  await db.insert(waMessages).values({ conversationId: conversation.id, direction: 'IN', text: text.slice(0, 4000), testMode: !whatsappConfigured });

  // Диалог передан человеку — бот молчит.
  if (conversation.handoff) return [];

  const result = nextStep(conversation.state as WaState, text, await botContext());
  let leadId = conversation.leadId;

  if (result.action === 'create_lead' && result.state.productId) {
    const lead = await createLead({
      source: 'WHATSAPP', name: result.state.name ?? 'Клиент WhatsApp', phone, buyerType: 'PRIVATE', locale: 'ru',
      items: [{ productId: result.state.productId, meters: result.state.meters ?? '0' }],
      citySlug: result.state.city, city: result.state.city,
    });
    leadId = lead.id;
    result.replies.push(`Номер заявки: ${lead.number}.`);
  }
  if (result.action === 'handoff') {
    await notifyManagers(`WhatsApp: клиент ${phone} просит менеджера`);
  }

  await db.update(waConversations).set({ state: result.state, handoff: result.action === 'handoff', leadId })
    .where(eq(waConversations.id, conversation.id));
  for (const reply of result.replies) await sendWhatsappText(conversation.id, phone, reply);
  return result.replies;
}
