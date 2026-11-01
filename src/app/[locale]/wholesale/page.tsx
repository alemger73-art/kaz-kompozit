import type { Metadata } from 'next';
import { IconCheck } from '@/components/site/icons';
import { LeadForm } from '@/components/site/lead-form';
import { PageHero, Section } from '@/components/site/section';
import { getDictionary, type Locale } from '@/lib/i18n';
import { routes } from '@/lib/paths';
import { buildMetadata } from '@/lib/seo';
import { getSeoOverride } from '@/server/public/catalog';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(locale);
  return buildMetadata({ locale, path: routes.wholesale, title: t.seo.wholesaleTitle, description: t.seo.wholesaleDesc, override: await getSeoOverride(routes.wholesale) });
}

function Panel({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div id={id} className="card scroll-mt-24 p-6 sm:p-8">
      <h2 className="font-display text-lg font-semibold uppercase">{title}</h2>
      {hint && <p className="mt-2 text-sm text-graphite-500">{hint}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

export default async function WholesalePage({ params }: Props) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const w = t.wholesale;

  return (
    <>
      <PageHero eyebrow="B2B" title={w.title} intro={w.intro}>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {w.features.map((feature) => (
            <li key={feature} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold">
              <IconCheck className="h-4 w-4 text-accent-500" />{feature}
            </li>
          ))}
        </ul>
      </PageHero>
      <Section tone="muted">
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel id="price" title={w.priceTitle}>
            <LeadForm t={t} source="WHOLESALE_PRICE" buyerType="WHOLESALE" fields={['email', 'company', 'city']} />
          </Panel>
          <Panel id="spec" title={w.specTitle} hint={w.specHint}>
            <LeadForm t={t} source="WHOLESALE_SPEC" buyerType="WHOLESALE" fields={['email', 'company', 'city', 'file', 'message']} />
          </Panel>
          <Panel id="register" title={w.registerTitle}>
            <LeadForm t={t} source="WHOLESALE_REGISTER" buyerType="WHOLESALE" fields={['email', 'company', 'bin', 'city', 'message']} />
          </Panel>
          <Panel id="regular" title={w.regularTitle} hint={w.regularHint}>
            <LeadForm t={t} source="WHOLESALE_REGULAR" buyerType="WHOLESALE" fields={['company', 'city', 'message']} />
          </Panel>
        </div>
      </Section>
    </>
  );
}
