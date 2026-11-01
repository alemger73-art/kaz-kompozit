'use server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { waConversations } from '@/db/schema';
import { isValidPhone } from '@/lib/phone';
import { audit } from '@/server/audit';
import { requireUser } from '@/server/auth/session';
import { handleIncomingMessage, sendWhatsappText } from '@/integrations/whatsapp/service';

/** Тестовая консоль: имитирует входящее сообщение клиента. */
export async function simulateIncoming(form: FormData) {
  await requireUser('integrations');
  const phone = String(form.get('phone') ?? '+77000000000');
  const text = String(form.get('text') ?? '').trim();
  if (text && isValidPhone(phone)) await handleIncomingMessage(phone, text);
  revalidatePath('/admin/whatsapp');
}

export async function replyAsManager(form: FormData) {
  const user = await requireUser('integrations');
  const id = String(form.get('conversationId'));
  const text = String(form.get('text') ?? '').trim().slice(0, 4000);
  const conversation = await db.query.waConversations.findFirst({ where: eq(waConversations.id, id) });
  if (!conversation || !text) return;
  await sendWhatsappText(conversation.id, conversation.phone, text);
  await audit(user.id, 'reply', 'whatsapp', id);
  revalidatePath('/admin/whatsapp');
}

export async function toggleHandoff(form: FormData) {
  const user = await requireUser('integrations');
  const id = String(form.get('conversationId'));
  const conversation = await db.query.waConversations.findFirst({ where: eq(waConversations.id, id) });
  if (!conversation) return;
  await db.update(waConversations).set({ handoff: !conversation.handoff, state: conversation.handoff ? {} : conversation.state })
    .where(eq(waConversations.id, id));
  await audit(user.id, conversation.handoff ? 'bot_on' : 'handoff', 'whatsapp', id);
  revalidatePath('/admin/whatsapp');
}
