import Link from 'next/link';
import type { Dictionary, Locale } from '@/lib/i18n';
import { localePath, routes } from '@/lib/paths';
import type { PublicSettings } from '@/server/public/catalog';
import { Logo } from './header';

export function SiteFooter({ locale, t, settings }: { locale: Locale; t: Dictionary; settings: PublicSettings }) {
  const p = (path: string) => localePath(locale, path);
  const columns = [
    [
      { href: p(routes.catalog), label: t.nav.catalog },
      { href: p(routes.calculator), label: t.nav.calculator },
      { href: p(routes.compare), label: t.nav.compare },
    ],
    [
      { href: p(routes.applications), label: t.nav.applications },
      { href: p(routes.projects), label: t.nav.projects },
      { href: p(routes.delivery), label: t.nav.delivery },
    ],
    [
      { href: p(routes.wholesale), label: t.nav.wholesale },
      { href: p(routes.about), label: t.nav.about },
      { href: p(routes.contacts), label: t.nav.contacts },
    ],
  ];
  const city = locale === 'kk' ? settings.cityKk : settings.cityRu;

  return (
    <footer className="bg-graphite-950 text-white">
      <div className="container-site grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo name={settings.companyName} href={p(routes.home)} />
          <p className="max-w-xs text-sm text-white/55">{t.hero.subtitle}</p>
          <div className="space-y-1 text-sm text-white/80">
            <div>{city}{settings.addressConfirmed && settings.address ? `, ${settings.address}` : ''}</div>
            {settings.phone && <div>{settings.phone}</div>}
            {settings.email && <div>{settings.email}</div>}
          </div>
        </div>
        {columns.map((column, i) => (
          <ul key={i} className="space-y-3 text-sm">
            {column.map((link) => (
              <li key={link.href}><Link href={link.href} className="text-white/65 transition hover:text-white">{link.label}</Link></li>
            ))}
          </ul>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-site flex flex-col gap-2 py-6 text-xs text-white/40 md:flex-row md:justify-between">
          <span>© {new Date().getFullYear()} {settings.companyName}. {t.footer.rights}</span>
          <span>{t.footer.disclaimer}</span>
        </div>
      </div>
    </footer>
  );
}
