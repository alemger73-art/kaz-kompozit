import '../globals.css';
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/site/footer';
import { SiteHeader } from '@/components/site/header';
import { getDictionary, isLocale } from '@/lib/i18n';
import { siteUrl } from '@/lib/config';
import { jsonLd } from '@/lib/seo';
import { getSettings } from '@/server/public/catalog';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    metadataBase: new URL(siteUrl),
    title: { default: settings.companyName, template: `%s | ${settings.companyName}` },
    icons: { icon: '/favicon.svg' },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport: Viewport = { themeColor: '#0f1113', width: 'device-width', initialScale: 1 };

export default async function LocaleLayout({ children, params }: {
  children: React.ReactNode; params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const settings = await getSettings();

  // Organization — только достоверные данные из настроек.
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.companyName,
    url: siteUrl,
    ...(settings.phone && { telephone: settings.phone }),
    ...(settings.email && { email: settings.email }),
    ...(settings.addressConfirmed && settings.address && {
      address: { '@type': 'PostalAddress', streetAddress: settings.address, addressLocality: settings.cityRu, addressCountry: 'KZ' },
    }),
    areaServed: 'KZ',
  };

  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organization) }} />
        <SiteHeader locale={locale} t={t} settings={settings} />
        <main className="flex-1">{children}</main>
        <SiteFooter locale={locale} t={t} settings={settings} />
      </body>
    </html>
  );
}
