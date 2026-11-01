import type { Locale } from './i18n';

export const routes = {
  home: '',
  catalog: '/catalog',
  product: (slug: string) => `/catalog/${slug}`,
  calculator: '/calculator',
  applications: '/applications',
  projects: '/projects',
  delivery: '/delivery',
  wholesale: '/wholesale',
  about: '/about',
  contacts: '/contacts',
  cart: '/cart',
  compare: '/compare',
} as const;

export function localePath(locale: Locale, path = ''): string {
  return `/${locale}${path}`;
}

/** Только цифры номера — для ссылок wa.me и tel:. */
export function phoneDigits(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
}

export function whatsappLink(phone: string | null | undefined, text?: string): string | null {
  const digits = phoneDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
