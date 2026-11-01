import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Calculator } from '@/components/site/calculator';
import { LeadForm } from '@/components/site/lead-form';
import { PriceTag } from '@/components/site/price-tag';
import { ProductActions } from '@/components/site/product-actions';
import { RebarVisual } from '@/components/site/rebar-visual';
import { WarningNote } from '@/components/site/section';
import { siteUrl } from '@/lib/config';
import { getDictionary, pick, type Locale } from '@/lib/i18n';
import { formatNumber } from '@/lib/money';
import { localePath, routes } from '@/lib/paths';
import { buildMetadata, jsonLd } from '@/lib/seo';
import { getCalcData } from '@/server/public/calc-data';
import { getPublicProduct, getPublishedCertificates, getSettings } from '@/server/public/catalog';

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getPublicProduct(slug);
  if (!product) return {};
  const name = pick(product, 'name', locale);
  return buildMetadata({
    locale,
    path: routes.product(slug),
    title: (locale === 'ru' && product.seoTitle) || name,
    description: (locale === 'ru' && product.seoDescription) || pick(product, 'description', locale).slice(0, 160),
    image: product.images[0] ?? null,
  });
}

function SpecRow({ label, value, unverified, note }: { label: string; value: React.ReactNode; unverified?: boolean; note?: string }) {
  return (
    <div className="grid grid-cols-[1fr_1.2fr] gap-4 border-b border-graphite-100 py-3 text-sm last:border-0">
      <dt className="text-graphite-500">{label}</dt>
      <dd className="font-semibold">
        {value}
        {unverified && <span className="ml-2 badge bg-fiber-300/30 text-fiber-600">{note}</span>}
      </dd>
    </div>
  );
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  const t = getDictionary(locale);
  const product = await getPublicProduct(slug);
  if (!product) notFound();

  const [calc, certificates, settings] = await Promise.all([
    getCalcData(locale), getPublishedCertificates(product.id), getSettings(),
  ]);
  const name = pick(product, 'name', locale);
  const description = pick(product, 'description', locale);
  const applications = pick(product, 'applications', locale);
  const leadTime = pick(product, 'leadTime', locale);
  const formats = product.supplyFormats.map((f) => {
    if (f === 'COIL' && product.coilLengthM) return `${t.formats.COIL} ${product.coilLengthM} ${t.common.meters}`;
    if (f === 'BAR' && product.barLengthM) return `${t.formats.BAR} ${formatNumber(product.barLengthM)} ${t.common.meters}`;
    return t.formats[f as keyof typeof t.formats] ?? f;
  });

  const productUrl = `${siteUrl}${localePath(locale, routes.product(slug))}`;
  const approvedPrice = product.retail.value && !product.retail.demo ? product.retail.value : null;
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    url: productUrl,
    brand: { '@type': 'Organization', name: settings.companyName },
    ...(product.images.length > 0 && { image: product.images }),
    // Предложение публикуется только с утверждённой ценой — без демо-значений.
    ...(approvedPrice && {
      offers: {
        '@type': 'Offer', priceCurrency: 'KZT', price: approvedPrice, url: productUrl,
        availability: product.availability === 'IN_STOCK' ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
      },
    }),
  };
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t.nav.catalog, item: `${siteUrl}${localePath(locale, routes.catalog)}` },
      { '@type': 'ListItem', position: 2, name, item: productUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd([structured, breadcrumbs]) }} />
      <section className="bg-white py-8 sm:py-12">
        <div className="container-site">
          <nav className="mb-6 text-sm text-graphite-500" aria-label="breadcrumbs">
            <Link href={localePath(locale, routes.catalog)} className="hover:text-accent-600">{t.nav.catalog}</Link>
            <span className="mx-2">/</span>
            <span className="text-graphite-900">{name}</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-graphite-950 tech-grid">
                {product.images[0] ? (
                  <Image src={product.images[0]} alt={name} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" unoptimized={product.images[0].startsWith('http')} />
                ) : (
                  <RebarVisual className="absolute inset-0 h-full w-full scale-125" />
                )}
                {product.diameterMm && (
                  <span className="absolute bottom-6 left-6 font-display text-7xl font-bold text-white drop-shadow">
                    Ø{formatNumber(product.diameterMm, 1)}<span className="ml-1 text-2xl text-white/60">{t.common.mm}</span>
                  </span>
                )}
              </div>
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {product.images.slice(1, 5).map((src) => (
                    <div key={src} className="relative aspect-square overflow-hidden rounded-lg bg-graphite-100">
                      <Image src={src} alt={name} fill sizes="12vw" className="object-cover" unoptimized={src.startsWith('http')} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <span className="badge bg-graphite-100 text-graphite-700">{t.availability[product.availability]}</span>
              <h1 className="font-display text-[clamp(1.15rem,5.4vw,2.25rem)] font-medium tracking-tight leading-tight [overflow-wrap:anywhere]">{name}</h1>
              {description && <p className="leading-relaxed text-graphite-600">{description}</p>}

              <div className="grid gap-3 rounded-xl border border-graphite-100 bg-graphite-50 p-5 sm:grid-cols-2">
                <div>
                  <div className="field-label">{t.product.price} · {t.product.retail}</div>
                  <PriceTag price={product.retail} t={t} size="lg" />
                </div>
                <div>
                  <div className="field-label">{t.product.wholesale}</div>
                  <PriceTag price={product.wholesale} t={t} />
                </div>
                {(product.retail.demo || product.wholesale.demo) && (
                  <p className="text-[11px] text-graphite-400 sm:col-span-2">{t.common.demoPriceNote}</p>
                )}
              </div>

              <ProductActions productId={product.id} defaultMeters={product.minOrderM ?? product.coilLengthM ?? 100} t={t} />

              <dl className="card px-5">
                {product.diameterMm && <SpecRow label={t.product.diameter} value={`${formatNumber(product.diameterMm, 1)} ${t.common.mm}`} />}
                <SpecRow
                  label={t.product.mass}
                  value={product.massPerMeterKg ? `${formatNumber(product.massPerMeterKg, 4)} ${t.common.kg}` : t.common.unknown}
                  unverified={!product.massVerified && Boolean(product.massPerMeterKg)}
                  note={t.product.massUnverified}
                />
                {formats.length > 0 && <SpecRow label={t.product.format} value={formats.join(', ')} />}
                {product.minOrderM && <SpecRow label={t.product.minOrder} value={`${product.minOrderM} ${t.common.meters}`} />}
                <SpecRow label={t.product.availability} value={t.availability[product.availability]} />
                {leadTime && <SpecRow label={t.product.leadTime} value={leadTime} />}
              </dl>

              <WarningNote>{t.product.warning}</WarningNote>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-graphite-50 py-12 sm:py-16">
        <div className="container-site grid gap-8 lg:grid-cols-3">
          <div className="card p-6 lg:col-span-2">
            <h2 className="mb-4 font-display text-lg font-medium tracking-tight">{t.product.specs}</h2>
            <dl>
              {product.specs.map((spec) => (
                <SpecRow
                  key={spec.labelRu}
                  label={locale === 'kk' ? spec.labelKk || spec.labelRu : spec.labelRu}
                  value={spec.value}
                  unverified={!spec.verified}
                  note={t.common.notConfirmed}
                />
              ))}
            </dl>
            <p className="mt-4 text-xs text-graphite-400">{t.product.unverifiedNote}</p>
          </div>
          <div className="space-y-6">
            {applications && (
              <div className="card p-6">
                <h2 className="mb-3 font-display text-lg font-medium tracking-tight">{t.product.applications}</h2>
                <p className="text-sm leading-relaxed text-graphite-600">{applications}</p>
              </div>
            )}
            <div className="card p-6">
              <h2 className="mb-3 font-display text-lg font-medium tracking-tight">{t.product.documents}</h2>
              {certificates.length === 0 ? (
                <p className="text-sm text-graphite-500">{t.product.noDocuments}</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {certificates.map((c) => (
                    <li key={c.id}><a href={c.fileUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-600 hover:underline">{c.title}</a>{c.issuer && <span className="text-graphite-400"> · {c.issuer}</span>}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-graphite-950 py-12 tech-grid sm:py-16">
        <div className="container-site">
          <h2 className="h-section mb-8 text-white">{t.product.calc}</h2>
          <Calculator t={t} {...calc} whatsapp={settings.whatsapp} initialProductId={product.id} lockProduct />
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="container-site grid gap-8 lg:grid-cols-2">
          <div id="quote" className="card scroll-mt-24 p-6 sm:p-8">
            <h2 className="mb-5 font-display text-lg font-medium tracking-tight">{t.form.quoteTitle}</h2>
            <LeadForm t={t} source="QUOTE_REQUEST" fields={['email', 'company', 'city', 'message']} payload={{ items: [{ productId: product.id, meters: '0' }] }} submitLabel={t.common.requestQuote} />
          </div>
          <div className="card p-6 sm:p-8">
            <h2 className="mb-5 font-display text-lg font-medium tracking-tight">{t.form.quickOrderTitle}</h2>
            <LeadForm t={t} source="QUICK_ORDER" fields={['city']} payload={{ items: [{ productId: product.id, meters: String(product.minOrderM ?? 0) }] }} submitLabel={t.common.order} />
          </div>
        </div>
      </section>
    </>
  );
}
