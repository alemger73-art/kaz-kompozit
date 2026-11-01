import Link from 'next/link';
import type { Metadata } from 'next';
import { ProductCard } from '@/components/site/product-card';
import { PageHero } from '@/components/site/section';
import { getDictionary, pick, type Locale } from '@/lib/i18n';
import { formatNumber } from '@/lib/money';
import { localePath, routes } from '@/lib/paths';
import { buildMetadata } from '@/lib/seo';
import { getCategories, getPublicProducts, getSeoOverride, type PublicProduct } from '@/server/public/catalog';

type SearchParams = Record<string, string | undefined>;
type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<SearchParams> };

const FILTER_KEYS = ['category', 'diameter', 'format', 'coil', 'availability'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(locale);
  return buildMetadata({ locale, path: routes.catalog, title: t.seo.catalogTitle, description: t.seo.catalogDesc, override: await getSeoOverride(routes.catalog) });
}

function matches(product: PublicProduct, filters: SearchParams, categoryId: string | undefined): boolean {
  if (categoryId && product.categoryId !== categoryId) return false;
  if (filters.diameter && product.diameterMm !== null && Number(product.diameterMm) !== Number(filters.diameter)) return false;
  if (filters.diameter && product.diameterMm === null) return false;
  if (filters.format && !product.supplyFormats.includes(filters.format)) return false;
  if (filters.coil && String(product.coilLengthM) !== filters.coil) return false;
  if (filters.availability && product.availability !== filters.availability) return false;
  return true;
}

function uniqueSorted<T>(values: Array<T | null>, compare: (a: T, b: T) => number): T[] {
  return [...new Set(values.filter((v): v is T => v !== null))].sort(compare);
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const filters = await searchParams;
  const t = getDictionary(locale);
  const [products, categories] = await Promise.all([getPublicProducts(), getCategories()]);
  const base = localePath(locale, routes.catalog);
  const category = categories.find((c) => c.slug === filters.category);
  const visible = products.filter((p) => matches(p, filters, category?.id));

  const hrefWith = (key: FilterKey, value: string | null) => {
    const query = new URLSearchParams();
    for (const k of FILTER_KEYS) {
      const current = k === key ? value : filters[k];
      if (current) query.set(k, current);
    }
    const qs = query.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const groups: Array<{ key: FilterKey; title: string; options: Array<{ value: string; label: string }> }> = [
    {
      key: 'category', title: t.nav.catalog,
      options: categories.filter((c) => products.some((p) => p.categoryId === c.id)).map((c) => ({ value: c.slug, label: pick(c, 'name', locale) })),
    },
    {
      key: 'diameter', title: t.catalog.diameter,
      options: uniqueSorted(products.map((p) => p.diameterMm), (a, b) => Number(a) - Number(b))
        .map((d) => ({ value: String(Number(d)), label: `${formatNumber(d, 1)} ${t.common.mm}` })),
    },
    {
      key: 'format', title: t.catalog.format,
      options: uniqueSorted(products.flatMap((p) => p.supplyFormats), (a, b) => a.localeCompare(b))
        .map((f) => ({ value: f, label: t.formats[f as keyof typeof t.formats] ?? f })),
    },
    {
      key: 'coil', title: t.catalog.coilLength,
      options: uniqueSorted(products.map((p) => p.coilLengthM), (a, b) => a - b)
        .map((c) => ({ value: String(c), label: `${c} ${t.common.meters}` })),
    },
    {
      key: 'availability', title: t.catalog.availability,
      options: (['IN_STOCK', 'ON_ORDER', 'OUT_OF_STOCK'] as const)
        .filter((a) => products.some((p) => p.availability === a))
        .map((a) => ({ value: a, label: t.availability[a] })),
    },
  ];

  const hasFilters = FILTER_KEYS.some((k) => filters[k]);

  return (
    <>
      <PageHero eyebrow={t.nav.catalog} title={t.catalog.title} intro={t.catalog.intro} />
      <section className="bg-graphite-50 py-12 sm:py-16">
        <div className="container-site grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-6" aria-label={t.catalog.filters}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t.catalog.filters}</h2>
              {hasFilters && <Link href={base} className="text-xs font-bold text-accent-600 hover:underline">{t.catalog.reset}</Link>}
            </div>
            {groups.filter((g) => g.options.length > 1 || filters[g.key]).map((group) => (
              <div key={group.key}>
                <h3 className="field-label">{group.title}</h3>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={hrefWith(group.key, null)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${!filters[group.key] ? 'border-graphite-900 bg-graphite-900 text-white' : 'border-graphite-200 bg-white hover:border-graphite-900'}`}
                  >
                    {t.catalog.all}
                  </Link>
                  {group.options.map((option) => (
                    <Link
                      key={option.value}
                      href={hrefWith(group.key, option.value)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${filters[group.key] === option.value ? 'border-accent-500 bg-accent-500 text-graphite-950' : 'border-graphite-200 bg-white hover:border-graphite-900'}`}
                    >
                      {option.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </aside>
          <div>
            <p className="mb-5 text-sm text-graphite-500">{t.catalog.found}: <b className="text-graphite-900">{visible.length}</b></p>
            {visible.length === 0 ? (
              <p className="card p-8 text-graphite-500">{t.catalog.empty}</p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((product) => <ProductCard key={product.id} product={product} locale={locale} t={t} />)}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
