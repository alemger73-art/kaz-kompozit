import Link from 'next/link';
import type { Metadata } from 'next';
import { IconArrow } from '@/components/site/icons';
import { PageHero, Section, WarningNote } from '@/components/site/section';
import { getDictionary, type Locale } from '@/lib/i18n';
import { localePath, routes } from '@/lib/paths';
import { buildMetadata } from '@/lib/seo';
import { getSeoOverride } from '@/server/public/catalog';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(locale);
  return buildMetadata({ locale, path: routes.applications, title: t.seo.applicationsTitle, description: t.seo.applicationsDesc, override: await getSeoOverride(routes.applications) });
}

export default async function ApplicationsPage({ params }: Props) {
  const { locale } = await params;
  const t = getDictionary(locale);

  return (
    <>
      <PageHero eyebrow={t.nav.applications} title={t.applications.title} intro={t.applications.intro} />
      <Section>
        <div className="grid gap-5 md:grid-cols-2">
          {t.applications.items.map((item, i) => (
            <article key={item.key} id={item.key} className="card scroll-mt-24 p-7 transition hover:border-graphite-300">
              <span className="font-display text-sm font-semibold text-accent-500">0{i + 1}</span>
              <h2 className="mt-4 text-xl font-bold">{item.title}</h2>
              <p className="mt-3 leading-relaxed text-graphite-600">{item.text}</p>
            </article>
          ))}
        </div>
      </Section>
      <Section tone="muted" id="how-to-choose" title={t.applications.howToTitle}>
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <ol className="space-y-4">
            {t.applications.howTo.map((step, i) => (
              <li key={step} className="flex gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-graphite-900 font-display text-sm font-semibold text-white">{i + 1}</span>
                <p className="pt-1.5 leading-relaxed text-graphite-700">{step}</p>
              </li>
            ))}
          </ol>
          <div className="space-y-5">
            <WarningNote>{t.applications.warning}</WarningNote>
            <Link href={localePath(locale, routes.calculator)} className="btn-primary w-full">{t.hero.ctaCalc}<IconArrow /></Link>
          </div>
        </div>
      </Section>
    </>
  );
}
