import type { PublicPrice } from '@/lib/calculator';
import type { Dictionary } from '@/lib/i18n';
import { formatTenge } from '@/lib/money';

export function PriceTag({ price, t, size = 'md' }: { price: PublicPrice; t: Dictionary; size?: 'md' | 'lg' }) {
  if (!price.value) {
    return <span className={`font-bold text-graphite-700 ${size === 'lg' ? 'text-xl' : 'text-sm'}`}>{t.common.priceOnRequest}</span>;
  }
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
      <span className={`font-display font-semibold text-graphite-950 ${size === 'lg' ? 'text-3xl' : 'text-xl'}`}>
        {formatTenge(price.value)}
      </span>
      <span className="text-sm text-graphite-500">/ {t.common.meters}</span>
      {price.demo && (
        <span className="badge bg-fiber-300/40 text-fiber-600" title={t.common.demoPriceNote}>{t.common.demo}</span>
      )}
    </span>
  );
}
