import Link from 'next/link';
import type { Metadata } from 'next';
import { Calculator } from '@/components/site/calculator';
import { Faq } from '@/components/site/faq';
import { IconArrow, IconCheck, IconPhone, IconTruck, IconWhatsapp } from '@/components/site/icons';
import { LeadForm } from '@/components/site/lead-form';
import { CrossSection, type CrossSectionItem } from '@/components/site/cross-section';
import { ProductSpecRow } from '@/components/site/product-card';
import { Section } from '@/components/site/section';
import { getDictionary, type Locale } from '@/lib/i18n';
import { localePath, phoneDigits, routes, whatsappLink } from '@/lib/paths';
import { buildMetadata } from '@/lib/seo';
import { getCalcData } from '@/server/public/calc-data';
import { getFaq, getPublicProducts, getSeoOverride, getSettings } from '@/server/public/catalog';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(locale);
  return buildMetadata({ locale, path: '', title: t.seo.homeTitle, description: t.seo.homeDesc, override: await getSeoOverride('/') });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);
  const [products, calc, faq, settings] = await Promise.all([getPublicProducts(), getCalcData(locale), getFaq(), getSettings()]);
  const tel = phoneDigits(settings.phone);
  const wa = whatsappLink(settings.whatsapp);
  const sectionItems: CrossSectionItem[] = products
    .filter((product) => product.diameterMm)
    .map((product) => ({
      slug: product.slug,
      href: p(routes.product(product.slug)),
      diameterMm: Number(product.diameterMm),
      formats: product.supplyFormats.map((f) => t.formats[f as keyof typeof t.formats] ?? f).join(' / '),
      retail: product.retail,
    }));

  return (
    <>
      {/* ───── Первый экран: сечение арматуры ───── */}
      <section className="relative overflow-hidden bg-graphite-50 tech-grid-light">
        <div className="container-site grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.35fr_1fr] lg:gap-14 lg:py-24">
          <div>
            <p className="text-sm font-semibold text-graphite-500">{t.hero.eyebrow}</p>
            <h1 className="h-display mt-5 text-[clamp(1.7rem,7.4vw,3.4rem)] text-graphite-950 lg:text-[clamp(2rem,3.3vw,2.9rem)] [overflow-wrap:anywhere]">{t.hero.title}</h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-graphite-600">{t.hero.subtitle}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href={p(routes.calculator)} className="btn-primary px-7 py-4">{t.hero.ctaCalc}</Link>
              <Link href={p(routes.wholesale)} className="btn-outline px-7 py-4">{t.hero.ctaWholesale}</Link>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-graphite-700">
              {t.hero.facts.map((fact) => (
                <li key={fact} className="flex items-center gap-2"><IconCheck className="h-4 w-4 text-accent-600" />{fact}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[2rem] border border-graphite-200 bg-white/80 p-6 shadow-[0_40px_80px_-48px_rgba(17,26,31,.45)] backdrop-blur sm:p-8">
            <CrossSection t={t} items={sectionItems} />
          </div>
        </div>
      </section>

      {/* ───── Преимущества ───── */}
      <Section title={t.home.advantagesTitle}>
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.advantages.map((item) => (
            <div key={item.title} className="border-t-2 border-graphite-950 pt-5">
              <h3 className="text-lg font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-graphite-500">{item.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ───── Диаметры ───── */}
      <Section
        tone="muted"
        title={t.home.popularTitle}
        action={<Link href={p(routes.catalog)} className="btn-outline">{t.hero.ctaCatalog}<IconArrow /></Link>}
      >
        <div className="border-b border-graphite-200">
          {products.slice(0, 4).map((product) => <ProductSpecRow key={product.id} product={product} locale={locale} t={t} />)}
        </div>
      </Section>

      {/* ───── Свойства ───── */}
      <Section title={t.home.propertiesTitle}>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.properties.map((item) => (
            <div key={item.title} className="border-l-2 border-accent-500 pl-5">
              <h3 className="font-bold">{item.title}</h3>
              <p className="mt-2 text-sm text-graphite-500">{item.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ───── Калькулятор ───── */}
      <Section id="calc" tone="dark" eyebrow={t.nav.calculator} title={t.home.calcTitle} intro={t.calc.intro}>
        <Calculator t={t} {...calc} whatsapp={settings.whatsapp} />
      </Section>

      {/* ───── Применение ───── */}
      <Section
        eyebrow={t.nav.applications}
        title={t.home.applicationsTitle}
        action={<Link href={p(routes.applications)} className="btn-outline">{t.common.more}<IconArrow /></Link>}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.applications.items.map((item) => (
            <Link
              key={item.key}
              href={`${p(routes.applications)}#${item.key}`}
              className="group relative overflow-hidden rounded-2xl bg-graphite-900 p-7 text-white transition hover:bg-graphite-800"
            >
              <h3 className="relative text-lg font-bold">{item.title}</h3>
              <p className="relative mt-3 text-sm text-white/55">{item.text}</p>
              <IconArrow className="relative mt-6 h-5 w-5 text-accent-500 transition group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </Section>

      {/* ───── Доставка и опт ───── */}
      <section className="bg-graphite-50 py-16 sm:py-24">
        <div className="container-site grid gap-6 lg:grid-cols-2">
          <div className="card flex flex-col p-8 sm:p-10">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-accent-500 text-graphite-950"><IconTruck /></span>
            <h2 className="mt-6 font-display text-2xl font-medium tracking-tight">{t.home.deliveryTitle}</h2>
            <p className="mt-3 flex-1 text-graphite-500">{t.home.deliveryText}</p>
            <Link href={p(routes.delivery)} className="btn-dark mt-8 self-start">{t.delivery.formTitle}<IconArrow /></Link>
          </div>
          <div className="flex flex-col rounded-2xl bg-accent-500 p-8 text-graphite-950 sm:p-10">
            <h2 className="font-display text-2xl font-medium tracking-tight">{t.home.wholesaleTitle}</h2>
            <p className="mt-3 flex-1 text-graphite-800">{t.home.wholesaleText}</p>
            <Link href={p(routes.wholesale)} className="btn-dark mt-8 self-start">{t.hero.ctaWholesale}<IconArrow /></Link>
          </div>
        </div>
      </section>

      {/* ───── FAQ ───── */}
      {faq.length > 0 && (
        <Section title={t.home.faqTitle}>
          <Faq items={faq} locale={locale} />
        </Section>
      )}

      {/* ───── Контакты ───── */}
      <Section tone="dark" title={t.home.contactsTitle}>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-5">
            {tel && <a href={`tel:+${tel}`} className="flex items-center gap-3 font-display text-2xl font-semibold"><IconPhone className="h-6 w-6 text-accent-500" />{settings.phone}</a>}
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-ghost-light"><IconWhatsapp />WhatsApp</a>}
            <p className="text-white/60">{locale === 'kk' ? settings.cityKk : settings.cityRu}{settings.addressConfirmed && settings.address ? `, ${settings.address}` : ''}</p>
            {settings.workHours && <p className="text-white/60">{settings.workHours}</p>}
            <Link href={p(routes.contacts)} className="inline-flex items-center gap-2 text-sm font-bold text-accent-400">{t.nav.contacts}<IconArrow /></Link>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <h3 className="mb-5 text-base font-semibold text-white/80">{t.form.callbackTitle}</h3>
            <LeadForm t={t} source="CALLBACK" fields={[]} dark submitLabel={t.common.callMe} />
          </div>
        </div>
      </Section>
    </>
  );
}
