'use client';
import Link from 'next/link';
import type { PublicPrice } from '@/lib/calculator';
import type { Dictionary } from '@/lib/i18n';
import { dec, formatTenge } from '@/lib/money';
import { LeadForm } from './lead-form';
import { useCart, useFavorites } from './store';
import { IconClose } from './icons';
import { ProductActions } from './product-actions';

export type CartProduct = {
  id: string;
  name: string;
  href: string;
  retail: PublicPrice;
  minOrderM: number | null;
  coilLengthM: number | null;
};

export function CartView({ t, products }: { t: Dictionary; products: CartProduct[] }) {
  const cart = useCart();
  const favorites = useFavorites();
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = cart.items.filter((i) => byId.has(i.productId));
  const favoriteProducts = favorites.ids.map((id) => byId.get(id)).filter((p): p is CartProduct => Boolean(p));

  const allPriced = lines.length > 0 && lines.every((l) => byId.get(l.productId)!.retail.value);
  const total = allPriced
    ? lines.reduce((sum, l) => sum.plus(dec(l.meters).mul(byId.get(l.productId)!.retail.value!)), dec(0))
    : null;

  return (
    <div className="space-y-16">
      <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          {lines.length === 0 ? (
            <p className="card p-8 text-graphite-500">{t.cart.empty}</p>
          ) : (
            <ul className="divide-y divide-graphite-100 card">
              {lines.map((line) => {
                const product = byId.get(line.productId)!;
                return (
                  <li key={line.productId} className="flex flex-wrap items-center gap-4 p-5">
                    <Link href={product.href} className="min-w-0 flex-1 font-bold hover:text-accent-600">{product.name}</Link>
                    <label className="flex items-center gap-2 text-sm">
                      <span className="text-graphite-500">{t.cart.meters}</span>
                      <input
                        type="number"
                        min={1}
                        value={line.meters}
                        onChange={(e) => cart.setMeters(line.productId, Math.max(0, Number(e.target.value)))}
                        className="field w-28"
                      />
                    </label>
                    <span className="w-32 text-right text-sm font-bold">
                      {product.retail.value ? formatTenge(dec(line.meters).mul(product.retail.value).toFixed(2)) : t.common.priceOnRequest}
                    </span>
                    <button type="button" onClick={() => cart.remove(line.productId)} aria-label={t.common.remove} className="rounded p-1 text-graphite-400 hover:text-red-600">
                      <IconClose className="h-5 w-5" />
                    </button>
                  </li>
                );
              })}
              <li className="flex items-center justify-between p-5">
                <span className="text-sm font-semibold text-graphite-500">{t.calc.preliminary}</span>
                <span className="font-display text-xl font-semibold">{total ? formatTenge(total.toFixed(2)) : '—'}</span>
              </li>
            </ul>
          )}
          {lines.some((l) => byId.get(l.productId)!.retail.demo) && <p className="mt-3 text-xs text-graphite-400">{t.common.demoPriceNote}</p>}
        </div>
        {lines.length > 0 && (
          <div className="card p-6 sm:p-8">
            <h2 className="mb-5 font-display text-lg font-medium tracking-tight">{t.cart.submit}</h2>
            <LeadForm
              t={t}
              source="CART"
              fields={['company', 'city', 'message']}
              submitLabel={t.cart.submit}
              getPayload={() => ({ items: lines.map((l) => ({ productId: l.productId, meters: String(l.meters) })) })}
              onSuccess={() => cart.clear()}
            />
          </div>
        )}
      </div>

      <div id="favorites" className="scroll-mt-24">
        <h2 className="h-section mb-6">{t.cart.favoritesTitle}</h2>
        {favoriteProducts.length === 0 ? (
          <p className="text-graphite-500">{t.cart.favoritesEmpty}</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {favoriteProducts.map((product) => (
              <li key={product.id} className="card flex flex-col gap-4 p-5">
                <Link href={product.href} className="font-bold hover:text-accent-600">{product.name}</Link>
                <ProductActions productId={product.id} defaultMeters={product.minOrderM ?? product.coilLengthM ?? 100} t={t} compact />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
