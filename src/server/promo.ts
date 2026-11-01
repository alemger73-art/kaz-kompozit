import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { promoCodes } from '@/db/schema';

export type ValidPromo = { code: string; percent: string };

export async function findValidPromo(rawCode: string | null | undefined): Promise<ValidPromo | null> {
  const code = rawCode?.trim().toUpperCase();
  if (!code || code.length > 40) return null;
  const promo = await db.query.promoCodes.findFirst({ where: and(eq(promoCodes.code, code), eq(promoCodes.active, true)) });
  if (!promo) return null;
  if (promo.expiresAt && promo.expiresAt < new Date()) return null;
  if (promo.maxUses !== null && promo.uses >= promo.maxUses) return null;
  return { code: promo.code, percent: promo.percent };
}

export async function registerPromoUse(code: string) {
  await db.update(promoCodes).set({ uses: sql`${promoCodes.uses} + 1` }).where(eq(promoCodes.code, code));
}
