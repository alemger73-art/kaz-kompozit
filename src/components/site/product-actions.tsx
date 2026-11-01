'use client';
import type { Dictionary } from '@/lib/i18n';
import { useCart, useCompare, useFavorites } from './store';
import { IconCart, IconCheck, IconCompare, IconHeart } from './icons';

export function ProductActions({ productId, defaultMeters, t, compact }: {
  productId: string; defaultMeters: number; t: Dictionary; compact?: boolean;
}) {
  const cart = useCart();
  const favorites = useFavorites();
  const compare = useCompare();
  const inCart = cart.items.some((i) => i.productId === productId);
  const iconButton = 'grid h-10 w-10 place-items-center rounded-md border transition';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => (inCart ? cart.remove(productId) : cart.setMeters(productId, defaultMeters))}
        className={`${inCart ? 'btn-dark' : 'btn-primary'} ${compact ? 'btn-sm flex-1' : 'flex-1'}`}
      >
        {inCart ? <IconCheck /> : <IconCart className="h-4 w-4" />}
        {inCart ? t.common.inCart : t.common.addToCart}
      </button>
      <button
        type="button"
        onClick={() => favorites.toggle(productId)}
        aria-pressed={favorites.has(productId)}
        title={favorites.has(productId) ? t.product.unfavorite : t.product.favorite}
        className={`${iconButton} ${favorites.has(productId) ? 'border-accent-500 text-accent-500' : 'border-graphite-200 text-graphite-500 hover:border-graphite-900 hover:text-graphite-900'}`}
      >
        <IconHeart filled={favorites.has(productId)} />
      </button>
      <button
        type="button"
        onClick={() => compare.toggle(productId)}
        aria-pressed={compare.has(productId)}
        title={compare.has(productId) ? t.product.comparing : t.product.compare}
        className={`${iconButton} ${compare.has(productId) ? 'border-accent-500 bg-accent-500 text-graphite-950' : 'border-graphite-200 text-graphite-500 hover:border-graphite-900 hover:text-graphite-900'}`}
      >
        <IconCompare />
      </button>
    </div>
  );
}
