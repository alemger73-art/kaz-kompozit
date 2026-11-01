'use client';
import Link from 'next/link';
import type { Dictionary } from '@/lib/i18n';
import { useCompare } from './store';
import { IconClose } from './icons';

export type CompareProduct = {
  id: string;
  name: string;
  href: string;
  /** Пары «параметр → значение», одинаковые по составу для всех товаров */
  rows: Array<{ label: string; value: string }>;
};

export function CompareView({ t, products }: { t: Dictionary; products: CompareProduct[] }) {
  const compare = useCompare();
  const selected = compare.ids.map((id) => products.find((p) => p.id === id)).filter((p): p is CompareProduct => Boolean(p));

  if (selected.length === 0) return <p className="card p-8 text-graphite-500">{t.compare.empty}</p>;

  const labels = selected[0].rows.map((r) => r.label);
  return (
    <div className="overflow-x-auto card">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-graphite-100">
            <th className="w-48 p-4 text-left text-xs font-semibold text-graphite-500">{t.compare.parameter}</th>
            {selected.map((p) => (
              <th key={p.id} className="p-4 text-left align-top">
                <div className="flex items-start justify-between gap-2">
                  <Link href={p.href} className="font-bold hover:text-accent-600">{p.name}</Link>
                  <button type="button" onClick={() => compare.toggle(p.id)} aria-label={t.common.remove} className="text-graphite-400 hover:text-red-600">
                    <IconClose className="h-4 w-4" />
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((label, index) => (
            <tr key={label} className="border-b border-graphite-50 last:border-0 odd:bg-graphite-50/50">
              <td className="p-4 font-semibold text-graphite-600">{label}</td>
              {selected.map((p) => <td key={p.id} className="p-4">{p.rows[index]?.value ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
