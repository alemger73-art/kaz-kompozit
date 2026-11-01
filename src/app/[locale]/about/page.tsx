import type { Metadata } from 'next';
import { IconCheck } from '@/components/site/icons';
import { PageHero, Section } from '@/components/site/section';
import { getDictionary, pick, type Locale } from '@/lib/i18n';
import { routes } from '@/lib/paths';
import { buildMetadata } from '@/lib/seo';
import { getSeoOverride, getSettings } from '@/server/public/catalog';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(locale);
  return buildMetadata({ locale, path: routes.about, title: t.seo.aboutTitle, description: t.seo.aboutDesc, override: await getSeoOverride(routes.about) });
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const settings = await getSettings();
  const about = pick(settings, 'about', locale);

  return (
    <>
      <PageHero eyebrow={t.nav.about} title={settings.companyName} />
      <Section>
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="prose-site text-lg">{about.split('\n').map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
          <div>
            <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-graphite-500">{t.about.whatWeDo}</h2>
            <ul className="space-y-3">
              {t.about.services.map((service) => (
                <li key={service} className="flex items-center gap-3 card px-5 py-4 font-semibold">
                  <IconCheck className="h-5 w-5 text-accent-500" />{service}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
    </>
  );
}
