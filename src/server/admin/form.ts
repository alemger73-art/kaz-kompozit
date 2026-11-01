import 'server-only';
import { z } from 'zod';

/** Утилиты разбора форм админки. */
export const str = (max = 500) => z.string().trim().max(max);
export const optStr = (max = 500) => z.string().trim().max(max).optional().transform((v) => v || null);
export const optInt = z.string().trim().optional()
  .transform((v) => (v ? Number(v) : null))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 0), 'Ожидается целое число');
export const optMoney = z.string().trim().optional()
  .transform((v) => (v ? v.replace(',', '.').replace(/\s/g, '') : null))
  .refine((v) => v === null || /^\d{1,12}(\.\d{1,4})?$/.test(v), 'Некорректная сумма');
export const checkbox = z.string().optional().transform((v) => v === 'on' || v === 'true');

export function formObject(form: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string' && !(key in result)) result[key] = value;
  }
  return result;
}

export function firstError(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue ? `${issue.path.join('.') || 'Поле'}: ${issue.message}` : 'Ошибка в форме';
}
