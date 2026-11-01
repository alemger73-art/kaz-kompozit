import type { Metadata } from 'next';
import { Calculator } from '@/components/site/calculator';
import { PageHero, WarningNote } from '@/components/site/section';
import { getDictionary, type Locale } from '@/lib/i18n';
import { routes } from '@/lib/paths';
import { buildMetadata } from '@/lib/seo';
import { getCalcData } from '@/server/public/calc-data';
import { getSeoOverride, getSettings } from '@/server/public/catalog';

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ product?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(locale);
  return buildMetadata({ locale, path: routes.calculator, title: t.seo.calcTitle, description: t.seo.calcDesc, override: await getSeoOverride(routes.calculator) });
}

export default async function CalculatorPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { product } = await searchParams;
  const t = getDictionary(locale);
  const [calc, settings] = await Promise.all([getCalcData(locale), getSettings()]);

  return (
    <>
      <PageHero eyebrow={t.nav.calculator} title={t.calc.title} intro={t.calc.intro} />
      <section className="bg-graphite-50 py-12 sm:py-16">
        <div className="container-site space-y-6">
          <Calculator t={t} {...calc} whatsapp={settings.whatsapp} initialProductId={product} dark={false} />
          <WarningNote>{t.applications.warning}</WarningNote>
        </div>
      </section>
    </>
  );
}
