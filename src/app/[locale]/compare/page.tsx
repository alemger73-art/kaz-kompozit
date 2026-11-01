import type { Metadata } from 'next';
import { CompareView } from '@/components/site/compare-view';
import { PageHero } from '@/components/site/section';
import { getDictionary, pick, type Locale } from '@/lib/i18n';
import { formatNumber, formatTenge } from '@/lib/money';
import { localePath, routes } from '@/lib/paths';
import { getPublicProducts, type PublicProduct } from '@/server/public/catalog';
import type { PublicPrice } from '@/lib/calculator';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDictionary(locale).seo.compareTitle, robots: { index: false } };
}

export default async function ComparePage({ params }: Props) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const products = await getPublicProducts();

  const price = (p: PublicPrice) => (p.value ? `${formatTenge(p.value)}${p.demo ? ` (${t.common.demo})` : ''}` : t.common.priceOnRequest);
  const rowsFor = (p: PublicProduct) => [
    { label: t.product.diameter, value: p.diameterMm ? `${formatNumber(p.diameterMm, 1)} ${t.common.mm}` : '—' },
    { label: `${t.product.price} (${t.product.retail})`, value: price(p.retail) },
    { label: `${t.product.price} (${t.product.wholesale})`, value: price(p.wholesale) },
    { label: t.product.mass, value: p.massPerMeterKg ? `${formatNumber(p.massPerMeterKg, 4)} ${t.common.kg}${p.massVerified ? '' : ` (${t.common.notConfirmed})`}` : '—' },
    { label: t.product.format, value: p.supplyFormats.map((f) => t.formats[f as keyof typeof t.formats] ?? f).join(', ') || '—' },
    { label: t.catalog.coilLength, value: p.coilLengthM ? `${p.coilLengthM} ${t.common.meters}` : '—' },
    { label: t.product.minOrder, value: p.minOrderM ? `${p.minOrderM} ${t.common.meters}` : '—' },
    { label: t.product.availability, value: t.availability[p.availability] },
  ];

  return (
    <>
      <PageHero title={t.compare.title} />
      <section className="bg-graphite-50 py-12 sm:py-16">
        <div className="container-site">
          <CompareView
            t={t}
            products={products.map((p) => ({ id: p.id, name: pick(p, 'name', locale), href: localePath(locale, routes.product(p.slug)), rows: rowsFor(p) }))}
          />
        </div>
      </section>
    </>
  );
}
