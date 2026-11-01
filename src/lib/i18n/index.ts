import { ru, type Dictionary } from './ru';
import { kk } from './kk';

export const locales = ['ru', 'kk'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ru';

const dictionaries: Record<Locale, Dictionary> = { ru, kk };

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? ru;
}

/** Выбирает поле на нужном языке: pick(product, 'name', 'kk') → product.nameKk ?? product.nameRu */
export function pick<T extends Record<string, unknown>>(row: T, field: string, locale: Locale): string {
  const suffix = locale === 'kk' ? 'Kk' : 'Ru';
  const localized = row[`${field}${suffix}`];
  const fallback = row[`${field}Ru`];
  return String((localized || fallback) ?? '');
}

export { interpolate } from './format';

export type { Dictionary };
