'use client';
/**
 * Локальное хранилище посетителя: заявка (корзина), избранное, сравнение.
 * Данные живут в localStorage браузера и синхронизируются между вкладками.
 */
import { useCallback, useSyncExternalStore } from 'react';

export type CartItem = { productId: string; meters: number };

const KEYS = { cart: 'kk.cart', favorites: 'kk.favorites', compare: 'kk.compare' } as const;
type StoreKey = keyof typeof KEYS;

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function read<T>(key: StoreKey, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEYS[key]);
  } catch {
    return fallback;
  }
  const cached = cache.get(key);
  if (cached && cached.raw === raw) return cached.value as T;
  let value: T = fallback;
  try {
    value = raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    value = fallback;
  }
  cache.set(key, { raw, value });
  return value;
}

function write<T>(key: StoreKey, value: T) {
  try {
    window.localStorage.setItem(KEYS[key], JSON.stringify(value));
  } catch {
    // Хранилище недоступно (приватный режим) — работаем без сохранения.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  window.addEventListener('storage', notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener('storage', notify);
  };
}

const EMPTY: never[] = [];

function useStored<T>(key: StoreKey): T[] {
  return useSyncExternalStore(subscribe, () => read<T[]>(key, EMPTY), () => EMPTY);
}

export function useCart() {
  const items = useStored<CartItem>('cart');

  const setMeters = useCallback((productId: string, meters: number) => {
    const current = read<CartItem[]>('cart', []);
    const exists = current.some((i) => i.productId === productId);
    const next = exists
      ? current.map((i) => (i.productId === productId ? { ...i, meters } : i))
      : [...current, { productId, meters }];
    write('cart', next);
  }, []);

  const remove = useCallback((productId: string) => {
    write('cart', read<CartItem[]>('cart', []).filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => write('cart', []), []);

  return { items, setMeters, remove, clear };
}

function useIdList(key: 'favorites' | 'compare', limit?: number) {
  const ids = useStored<string>(key);
  const toggle = useCallback((id: string) => {
    const current = read<string[]>(key, []);
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    write(key, limit ? next.slice(-limit) : next);
  }, [key, limit]);
  const clear = useCallback(() => write(key, []), [key]);
  return { ids, toggle, clear, has: (id: string) => ids.includes(id) };
}

export const useFavorites = () => useIdList('favorites');
export const useCompare = () => useIdList('compare', 4);
