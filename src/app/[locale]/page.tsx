import Link from 'next/link';
import type { Metadata } from 'next';
import { Calculator } from '@/components/site/calculator';
import { Faq } from '@/components/site/faq';
import { IconArrow, IconCheck, IconPhone, IconTruck, IconWhatsapp } from '@/components/site/icons';
import { LeadForm } from '@/components/site/lead-form';
import { ProductCard } from '@/components/site/product-card';
import { RebarVisual } from '@/components/site/rebar-visual';
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

  return (
    <>
      {/* ───── Первый экран ───── */}
      <section className="relative overflow-hidden bg-graphite-950 text-white tech-grid">
        <div className="pointer-events-none absolute -right-40 top-1/2 hidden w-[900px] -translate-y-1/2 opacity-90 lg:block">
          <RebarVisual className="h-auto w-full" />
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-graphite-950 via-graphite-950/90 to-transparent" />
        <div className="container-site relative py-16 sm:py-24 lg:py-32">
          <span className="eyebrow animate-rise">{t.hero.eyebrow}</span>
          <h1 className="h-display mt-6 max-w-3xl animate-rise text-[clamp(1.3rem,6.2vw,4.5rem)] [animation-delay:80ms]">
            {t.hero.title.split(' ').map((word, i) => (
              <span key={word} className={i === 0 ? 'block text-accent-500' : 'block'}>{word}</span>
            ))}
          </h1>
          <p className="mt-6 max-w-xl animate-rise text-lg text-white/70 [animation-delay:160ms]">{t.hero.subtitle}</p>
          <div className="mt-10 flex animate-rise flex-col gap-3 [animation-delay:240ms] sm:flex-row sm:flex-wrap">
            <Link href={p(routes.calculator)} className="btn-primary px-7 py-4">{t.hero.ctaCalc}<IconArrow /></Link>
            <Link href={p(routes.catalog)} className="btn-ghost-light px-7 py-4">{t.hero.ctaCatalog}</Link>
            <Link href={p(routes.wholesale)} className="btn-ghost-light px-7 py-4">{t.hero.ctaWholesale}</Link>
          </div>
          <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm font-semibold text-white/80">
            {t.hero.facts.map((fact) => (
              <li key={fact} className="flex items-center gap-2"><IconCheck className="h-4 w-4 text-accent-500" />{fact}</li>
            ))}
          </ul>
          <div className="mt-10 lg:hidden"><RebarVisual className="h-auto w-full" /></div>
        </div>
      </section>

      {/* ───── Преимущества ───── */}
      <Section eyebrow={t.home.advantagesEyebrow} title={t.home.advantagesTitle}>
        <div className="grid gap-px overflow-hidden rounded-xl border border-graphite-100 bg-graphite-100 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.advantages.map((item, i) => (
            <div key={item.title} className="group bg-white p-7 transition hover:bg-graphite-950 hover:text-white">
              <span className="font-display text-sm font-semibold text-accent-500">0{i + 1}</span>
              <h3 className="mt-6 text-lg font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-graphite-500 group-hover:text-white/60">{item.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ───── Популярные диаметры ───── */}
      <Section
        tone="muted"
        eyebrow={t.nav.catalog}
        title={t.home.popularTitle}
        action={<Link href={p(routes.catalog)} className="btn-outline">{t.hero.ctaCatalog}<IconArrow /></Link>}
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} locale={locale} t={t} />)}
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
          {t.applications.items.map((item, i) => (
            <Link
              key={item.key}
              href={`${p(routes.applications)}#${item.key}`}
              className="group relative overflow-hidden rounded-xl bg-graphite-900 p-7 text-white transition hover:bg-graphite-800"
            >
              <span className="absolute -right-4 -top-6 font-display text-[7rem] font-bold leading-none text-white/[0.04] transition group-hover:text-accent-500/10">{i + 1}</span>
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
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-accent-500 text-white"><IconTruck /></span>
            <h2 className="mt-6 font-display text-2xl font-semibold uppercase">{t.home.deliveryTitle}</h2>
            <p className="mt-3 flex-1 text-graphite-500">{t.home.deliveryText}</p>
            <Link href={p(routes.delivery)} className="btn-dark mt-8 self-start">{t.delivery.formTitle}<IconArrow /></Link>
          </div>
          <div className="flex flex-col rounded-xl bg-accent-500 p-8 text-white sm:p-10">
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-white/70">B2B</span>
            <h2 className="mt-6 font-display text-2xl font-semibold uppercase">{t.home.wholesaleTitle}</h2>
            <p className="mt-3 flex-1 text-white/85">{t.home.wholesaleText}</p>
            <Link href={p(routes.wholesale)} className="btn mt-8 self-start bg-white text-graphite-950 hover:bg-graphite-100">{t.hero.ctaWholesale}<IconArrow /></Link>
          </div>
        </div>
      </section>

      {/* ───── FAQ ───── */}
      {faq.length > 0 && (
        <Section eyebrow="FAQ" title={t.home.faqTitle}>
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
            <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-white/70">{t.form.callbackTitle}</h3>
            <LeadForm t={t} source="CALLBACK" fields={[]} dark submitLabel={t.common.callMe} />
          </div>
        </div>
      </Section>
    </>
  );
}
