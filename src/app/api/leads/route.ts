import { NextResponse } from 'next/server';
import { z } from 'zod';
import { leadSourceEnum } from '@/db/schema';
import { isValidPhone } from '@/lib/phone';
import { createLead } from '@/server/leads';
import { allowRequest, clientIp } from '@/server/rate-limit';
import { parseSpecification, type SpecLine } from '@/server/spec-parser';
import { saveUpload, UploadError } from '@/server/storage';

const PUBLIC_SOURCES = leadSourceEnum.enumValues.filter((s) => s !== 'WHATSAPP' && s !== 'MANUAL') as [string, ...string[]];

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

const schema = z.object({
  source: z.enum(PUBLIC_SOURCES),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().refine(isValidPhone, 'Некорректный телефон'),
  email: z.string().trim().email().max(160).optional().or(z.literal('')).transform((v) => v || null),
  company: optionalText(200),
  bin: z.string().trim().regex(/^\d{12}$/).optional().or(z.literal('')).transform((v) => v || null),
  city: optionalText(120),
  message: optionalText(3000),
  buyerType: z.enum(['PRIVATE', 'WHOLESALE']).default('PRIVATE'),
  locale: z.enum(['ru', 'kk']).default('ru'),
});

const payloadSchema = z.object({
  items: z.array(z.object({
    productId: z.string().max(64),
    meters: z.union([z.string(), z.number()]).optional()
      .transform((v) => (v === undefined || v === '' ? '0' : String(v)))
      .refine((v) => /^\d{1,7}(\.\d{1,2})?$/.test(v), 'Некорректный метраж'),
    coils: z.number().int().min(0).max(100_000).optional(),
    bars: z.number().int().min(0).max(1_000_000).optional(),
  })).max(50).optional(),
  citySlug: z.string().max(64).nullable().optional(),
  promoCode: z.string().max(40).nullable().optional(),
}).default({});

function text(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  return typeof value === 'string' ? value : undefined;
}

export async function POST(request: Request) {
  if (!allowRequest(`lead:${clientIp(request.headers)}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: 'Слишком много заявок, попробуйте позже' }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
  // Ловушка для ботов: поле «website» видят только они.
  if (text(form, 'website')) return NextResponse.json({ number: 0 });

  const parsed = schema.safeParse(Object.fromEntries(
    ['source', 'name', 'phone', 'email', 'company', 'bin', 'city', 'message', 'buyerType', 'locale']
      .map((k) => [k, text(form, k)]).filter(([, v]) => v !== undefined),
  ));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Проверьте поля формы', issues: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  let payloadRaw: unknown = {};
  try {
    payloadRaw = JSON.parse(text(form, 'payload') ?? '{}');
  } catch {
    return NextResponse.json({ error: 'Некорректные данные расчёта' }, { status: 400 });
  }
  const payload = payloadSchema.safeParse(payloadRaw);
  if (!payload.success) return NextResponse.json({ error: 'Некорректные данные расчёта' }, { status: 422 });

  const attachments: string[] = [];
  let specLines: SpecLine[] = [];
  const file = form.get('file');
  if (file instanceof File && file.size > 0) {
    try {
      attachments.push(await saveUpload(file, 'private', 'document'));
      specLines = await parseSpecification(file);
    } catch (error) {
      if (error instanceof UploadError) return NextResponse.json({ error: error.message }, { status: 422 });
      throw error;
    }
  }

  const lead = await createLead({
    ...parsed.data,
    source: parsed.data.source as (typeof leadSourceEnum.enumValues)[number],
    items: payload.data.items,
    citySlug: payload.data.citySlug,
    promoCode: payload.data.promoCode,
    attachments,
    specLines,
  });
  return NextResponse.json({ number: lead.number }, { status: 201 });
}
