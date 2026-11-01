import Link from 'next/link';
import type { Dictionary, Locale } from '@/lib/i18n';
import { localePath, phoneDigits, routes } from '@/lib/paths';
import type { PublicSettings } from '@/server/public/catalog';
import { HeaderCounters, LangSwitch, MobileMenu, NavLinks } from './header-client';
import { IconPhone } from './icons';

export function Logo({ name, href }: { name: string; href: string }) {
  const [first, ...rest] = name.split(' ');
  return (
    <Link href={href} className="group flex items-center gap-2.5" aria-label={name}>
      <span className="grid h-9 w-9 place-items-center rounded-md bg-accent-500 font-display text-sm font-bold text-white transition group-hover:rotate-6">
        {first.slice(0, 1)}
      </span>
      <span className="font-display text-[15px] font-bold uppercase leading-none tracking-tight text-white">
        {first}
        {rest.length > 0 && <span className="block text-[10px] font-medium tracking-[0.3em] text-white/50">{rest.join(' ')}</span>}
      </span>
    </Link>
  );
}

export function SiteHeader({ locale, t, settings }: { locale: Locale; t: Dictionary; settings: PublicSettings }) {
  const p = (path: string) => localePath(locale, path);
  const items = [
    { href: p(routes.catalog), label: t.nav.catalog },
    { href: p(routes.calculator), label: t.nav.calculator },
    { href: p(routes.applications), label: t.nav.applications },
    { href: p(routes.delivery), label: t.nav.delivery },
    { href: p(routes.wholesale), label: t.nav.wholesale },
    { href: p(routes.projects), label: t.nav.projects },
    { href: p(routes.contacts), label: t.nav.contacts },
  ];
  const tel = phoneDigits(settings.phone);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-graphite-950/95 backdrop-blur">
      <div className="container-site flex h-16 items-center justify-between gap-4">
        <Logo name={settings.companyName} href={p(routes.home)} />
        <NavLinks items={items} />
        <div className="flex items-center gap-2">
          {tel && (
            <a href={`tel:+${tel}`} className="hidden items-center gap-2 text-sm font-bold text-white xl:flex">
              <IconPhone className="h-4 w-4 text-accent-500" />
              {settings.phone}
            </a>
          )}
          <HeaderCounters
            cartHref={p(routes.cart)}
            compareHref={p(routes.compare)}
            labels={{ cart: t.nav.cart, compare: t.nav.compare, favorites: t.nav.favorites }}
          />
          <div className="hidden sm:block"><LangSwitch current={locale} /></div>
          <MobileMenu
            items={[...items, { href: p(routes.about), label: t.nav.about }]}
            menuLabel={t.nav.menu}
            footer={<LangSwitch current={locale} />}
          />
        </div>
      </div>
    </header>
  );
}
