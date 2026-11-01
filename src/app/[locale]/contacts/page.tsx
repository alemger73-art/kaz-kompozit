import type { Metadata } from 'next';
import { LeadForm } from '@/components/site/lead-form';
import { PageHero, Section } from '@/components/site/section';
import { getDictionary, type Locale } from '@/lib/i18n';
import { phoneDigits, routes, whatsappLink } from '@/lib/paths';
import { buildMetadata } from '@/lib/seo';
import { getSeoOverride, getSettings } from '@/server/public/catalog';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(locale);
  return buildMetadata({ locale, path: routes.contacts, title: t.seo.contactsTitle, description: t.seo.contactsDesc, override: await getSeoOverride(routes.contacts) });
}

/** Карта показывается только для подтверждённого адреса и только со ссылки Яндекс/2ГИС/Google. */
function safeMapUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    return /(^|\.)(yandex\.(ru|kz|com)|2gis\.(kz|ru|com)|google\.com)$/.test(host) ? url : null;
  } catch {
    return null;
  }
}

export default async function ContactsPage({ params }: Props) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const s = await getSettings();
  const tel = phoneDigits(s.phone);
  const wa = whatsappLink(s.whatsapp);
  const map = s.addressConfirmed ? safeMapUrl(s.mapEmbedUrl) : null;

  const rows = [
    { label: t.contacts.phone, value: s.phone, href: tel ? `tel:+${tel}` : null },
    { label: t.contacts.whatsapp, value: s.whatsapp, href: wa },
    { label: t.contacts.email, value: s.email, href: s.email ? `mailto:${s.email}` : null },
    { label: t.contacts.city, value: locale === 'kk' ? s.cityKk : s.cityRu, href: null },
    { label: t.contacts.address, value: s.addressConfirmed ? s.address : null, href: null },
    { label: t.contacts.hours, value: s.workHours, href: null },
  ];

  return (
    <>
      <PageHero eyebrow={t.nav.contacts} title={t.contacts.title} />
      <Section>
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-8">
            <dl className="card divide-y divide-graphite-100">
              {rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-4 p-5">
                  <dt className="text-sm text-graphite-500">{row.label}</dt>
                  <dd className="text-right font-bold">
                    {row.value
                      ? row.href ? <a href={row.href} className="hover:text-accent-600" target={row.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{row.value}</a> : row.value
                      : <span className="font-normal text-graphite-400">{t.contacts.notSet}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            {map ? (
              <iframe src={map} title={t.contacts.address} loading="lazy" className="aspect-video w-full rounded-xl border border-graphite-100" />
            ) : (
              <p className="card bg-graphite-50 p-6 text-sm text-graphite-500">{t.contacts.mapPending}</p>
            )}
          </div>
          <div className="card p-6 sm:p-8">
            <h2 className="mb-5 font-display text-lg font-medium tracking-tight">{t.form.contactTitle}</h2>
            <LeadForm t={t} source="CONTACT_FORM" fields={['email', 'company', 'city', 'message']} />
          </div>
        </div>
      </Section>
    </>
  );
}
