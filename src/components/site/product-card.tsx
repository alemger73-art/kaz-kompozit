import Image from 'next/image';
import Link from 'next/link';
import type { Dictionary, Locale } from '@/lib/i18n';
import { pick } from '@/lib/i18n';
import { formatNumber } from '@/lib/money';
import { localePath, routes } from '@/lib/paths';
import type { PublicProduct } from '@/server/public/catalog';
import { PriceTag } from './price-tag';
import { ProductActions } from './product-actions';
import { RebarVisual } from './rebar-visual';

const availabilityStyle = {
  IN_STOCK: 'bg-emerald-50 text-emerald-700',
  ON_ORDER: 'bg-graphite-100 text-graphite-700',
  OUT_OF_STOCK: 'bg-red-50 text-red-700',
} as const;

export function ProductCard({ product, locale, t }: { product: PublicProduct; locale: Locale; t: Dictionary }) {
  const href = localePath(locale, routes.product(product.slug));
  const name = pick(product, 'name', locale);
  const formats = product.supplyFormats.map((f) => t.formats[f as keyof typeof t.formats] ?? f).join(' / ');

  return (
    <article className="group card flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-graphite-300 hover:shadow-[0_20px_40px_-24px_rgba(15,17,19,.35)]">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-graphite-900 tech-grid">
        {product.images[0] ? (
          <Image src={product.images[0]} alt={name} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <RebarVisual variant="card" className="absolute inset-0 h-full w-full scale-110 transition duration-700 group-hover:scale-125" />
        )}
        {product.diameterMm && (
          <span className="absolute left-4 top-4 font-display text-5xl font-bold leading-none text-white drop-shadow">
            Ø{formatNumber(product.diameterMm, 1)}
            <span className="ml-1 text-base font-medium text-white/70">{t.common.mm}</span>
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${availabilityStyle[product.availability]}`}>{t.availability[product.availability]}</span>
          {formats && <span className="badge bg-graphite-50 text-graphite-500">{formats}</span>}
        </div>
        <h3 className="text-base font-bold leading-snug">
          <Link href={href} className="hover:text-accent-600">{name}</Link>
        </h3>
        <div className="mt-auto space-y-4">
          <PriceTag price={product.retail} t={t} />
          <ProductActions productId={product.id} defaultMeters={product.minOrderM ?? product.coilLengthM ?? 100} t={t} compact />
        </div>
      </div>
    </article>
  );
}
