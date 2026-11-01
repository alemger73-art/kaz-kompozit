'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavGroup = { title: string; items: Array<{ href: string; label: string; badge?: number }> };

export function AdminNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));
  return (
    <nav className="space-y-5">
      {groups.map((group) => (
        <div key={group.title}>
          <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">{group.title}</div>
          <ul>
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition ${isActive(item.href) ? 'bg-white/10 font-bold text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'}`}
                >
                  {item.label}
                  {item.badge ? <span className="rounded-full bg-accent-500 px-1.5 text-[10px] font-bold text-graphite-950">{item.badge}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
