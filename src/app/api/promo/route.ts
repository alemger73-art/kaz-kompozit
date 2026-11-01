import { NextResponse } from 'next/server';
import { findValidPromo } from '@/server/promo';
import { allowRequest, clientIp } from '@/server/rate-limit';

export async function GET(request: Request) {
  if (!allowRequest(`promo:${clientIp(request.headers)}`, 20, 10 * 60_000)) {
    return NextResponse.json({ error: 'Слишком много попыток' }, { status: 429 });
  }
  const code = new URL(request.url).searchParams.get('code');
  const promo = await findValidPromo(code);
  return promo ? NextResponse.json(promo) : NextResponse.json({ error: 'Промокод недействителен' }, { status: 404 });
}
