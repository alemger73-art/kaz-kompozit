'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCart, useCompare, useFavorites } from './store';
import { IconCart, IconClose, IconCompare, IconHeart, IconMenu } from './icons';

type NavItem = { href: string; label: string };

export function LangSwitch({ current }: { current: 'ru' | 'kk' }) {
  const pathname = usePathname();
  const swap = (target: string) => pathname.replace(/^\/(ru|kk)(?=\/|$)/, `/${target}`);
  return (
    <div className="flex w-fit overflow-hidden rounded-md border border-white/15 text-[11px] font-bold">
      {(['ru', 'kk'] as const).map((loc) => (
        <Link
          key={loc}
          href={swap(loc)}
          hrefLang={loc}
          className={`px-2.5 py-1.5 uppercase transition ${current === loc ? 'bg-white text-graphite-950' : 'text-white/70 hover:text-white'}`}
        >
          {loc === 'ru' ? 'РУ' : 'ҚАЗ'}
        </Link>
      ))}
    </div>
  );
}

function CounterLink({ href, label, count, children }: { href: string; label: string; count: number; children: React.ReactNode }) {
  return (
    <Link href={href} aria-label={label} title={label} className="relative rounded-md p-2 text-white/80 transition hover:bg-white/10 hover:text-white">
      {children}
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}

export function HeaderCounters({ cartHref, compareHref, labels }: {
  cartHref: string; compareHref: string; labels: { cart: string; compare: string; favorites: string };
}) {
  const cart = useCart();
  const favorites = useFavorites();
  const compare = useCompare();
  return (
    <div className="flex items-center">
      <CounterLink href={`${cartHref}#favorites`} label={labels.favorites} count={favorites.ids.length}><IconHeart /></CounterLink>
      <CounterLink href={compareHref} label={labels.compare} count={compare.ids.length}><IconCompare /></CounterLink>
      <CounterLink href={cartHref} label={labels.cart} count={cart.items.length}><IconCart /></CounterLink>
    </div>
  );
}

export function MobileMenu({ items, menuLabel, footer }: { items: NavItem[]; menuLabel: string; footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen(true)} aria-label={menuLabel} className="rounded-md p-2 text-white hover:bg-white/10">
        <IconMenu />
      </button>
      {/* Портал: у шапки есть backdrop-blur, который ограничивает fixed-элементы её высотой. */}
      {open && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col bg-graphite-950 tech-grid">
          <div className="flex h-16 items-center justify-end px-4">
            <button type="button" onClick={() => setOpen(false)} aria-label="×" className="rounded-md p-2 text-white hover:bg-white/10">
              <IconClose />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-6">
            {items.map((item) => (
              <Link key={item.href} href={item.href} className="border-b border-white/10 py-4 font-display text-lg font-semibold uppercase text-white">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-6">{footer}</div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 lg:flex">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 text-[13px] font-semibold transition ${active ? 'text-white' : 'text-white/65 hover:text-white'}`}
          >
            {item.label}
            {active && <span className="mt-0.5 block h-0.5 rounded bg-accent-500" />}
          </Link>
        );
      })}
    </nav>
  );
}
