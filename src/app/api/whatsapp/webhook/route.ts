import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { whatsappEnv } from '@/integrations/whatsapp/config';
import { handleIncomingMessage } from '@/integrations/whatsapp/service';

export const runtime = 'nodejs';

/** Подтверждение вебхука в кабинете Meta. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.get('hub.mode') === 'subscribe' && whatsappEnv.verifyToken && params.get('hub.verify_token') === whatsappEnv.verifyToken) {
    return new NextResponse(params.get('hub.challenge') ?? '', { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

function validSignature(body: string, header: string | null): boolean {
  if (!whatsappEnv.appSecret) return false;
  if (!header?.startsWith('sha256=')) return false;
  const expected = Buffer.from(`sha256=${createHmac('sha256', whatsappEnv.appSecret).update(body).digest('hex')}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

type WebhookPayload = {
  entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ from: string; type: string; text?: { body: string } }> } }> }>;
};

export async function POST(request: Request) {
  const body = await request.text();
  // Без секрета приложения входящие запросы не принимаются: подпись проверить нечем.
  if (!validSignature(body, request.headers.get('x-hub-signature-256'))) {
    return new NextResponse('Invalid signature', { status: 401 });
  }
  const payload = JSON.parse(body) as WebhookPayload;
  const messages = payload.entry?.flatMap((e) => e.changes ?? []).flatMap((c) => c.value?.messages ?? []) ?? [];
  for (const message of messages) {
    if (message.type === 'text' && message.text?.body) await handleIncomingMessage(message.from, message.text.body);
  }
  return NextResponse.json({ ok: true });
}
