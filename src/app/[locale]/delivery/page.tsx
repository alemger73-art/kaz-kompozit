import type { Metadata } from 'next';
import { DeliveryExplorer } from '@/components/site/delivery-explorer';
import { PageHero, Section } from '@/components/site/section';
import { getDictionary, pick, type Locale } from '@/lib/i18n';
import { routes } from '@/lib/paths';
import { buildMetadata } from '@/lib/seo';
import { getDeliveryCities, getPublishedPartners, getSeoOverride } from '@/server/public/catalog';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(locale);
  return buildMetadata({ locale, path: routes.delivery, title: t.seo.deliveryTitle, description: t.seo.deliveryDesc, override: await getSeoOverride(routes.delivery) });
}

export default async function DeliveryPage({ params }: Props) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const [cities, partners] = await Promise.all([getDeliveryCities(), getPublishedPartners()]);

  return (
    <>
      <PageHero eyebrow={t.nav.delivery} title={t.delivery.title} intro={t.delivery.intro} />
      <Section tone="muted" title={t.delivery.chooseCity}>
        <DeliveryExplorer
          t={t}
          cities={cities.map((c) => ({
            slug: c.slug, name: pick(c, 'name', locale), region: c.regionRu, tariff: c.tariff,
            tariffConfirmed: c.tariffConfirmed, leadTime: c.leadTimeRu, mapX: c.mapX, mapY: c.mapY,
          }))}
        />
      </Section>
      <Section title={t.delivery.schemeTitle}>
        <ol className="grid gap-5 md:grid-cols-4">
          {t.delivery.scheme.map((step, i) => (
            <li key={step.title} className="relative card p-6">
              <span className="font-display text-4xl font-bold text-accent-500">{i + 1}</span>
              <h3 className="mt-3 font-bold">{step.title}</h3>
              <p className="mt-2 text-sm text-graphite-500">{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-sm text-graphite-500">
          {partners.length > 0 ? partners.map((p) => p.name).join(' · ') : t.delivery.partnersNote}
        </p>
      </Section>
    </>
  );
}
