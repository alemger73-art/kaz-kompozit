'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { PublicPrice } from '@/lib/calculator';
import type { Dictionary } from '@/lib/i18n';
import { formatNumber } from '@/lib/money';
import { PriceTag } from './price-tag';

export type CrossSectionItem = {
  slug: string;
  href: string;
  diameterMm: number;
  formats: string;
  retail: PublicPrice;
};

const SIZE = 420;
const CENTER = SIZE / 2;
const PX_PER_MM = 15;
const MAX_RADIUS = 12 * PX_PER_MM;

/** Детерминированная «упаковка» стеклонитей: шестиугольная сетка с небольшим смещением. */
const FIBERS = (() => {
  const step = 10;
  const dots: Array<{ x: number; y: number; r: number; o: number }> = [];
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let row = 0, y = CENTER - MAX_RADIUS; y <= CENTER + MAX_RADIUS; row++, y += step * 0.866) {
    for (let x = CENTER - MAX_RADIUS + (row % 2) * (step / 2); x <= CENTER + MAX_RADIUS; x += step) {
      if (Math.hypot(x - CENTER, y - CENTER) > MAX_RADIUS) continue;
      dots.push({ x: x + (rand() - 0.5) * 2.4, y: y + (rand() - 0.5) * 2.4, r: 3 + rand() * 1.2, o: 0.55 + rand() * 0.45 });
    }
  }
  return dots;
})();

/** Первый экран: сечение арматуры выбранного диаметра в масштабе к остальным. */
export function CrossSection({ items, t, initialSlug }: { items: CrossSectionItem[]; t: Dictionary; initialSlug?: string }) {
  const [slug, setSlug] = useState(initialSlug ?? items[Math.min(2, items.length - 1)]?.slug);
  const item = items.find((i) => i.slug === slug) ?? items[0];
  if (!item) return null;

  const radius = item.diameterMm * PX_PER_MM;
  const label = `Ø${formatNumber(item.diameterMm, 1)}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="relative mx-auto w-full max-w-[460px]">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto w-full" role="img" aria-label={`${label} ${t.common.mm}`}>
          <defs>
            <clipPath id="xs-clip">
              <circle cx={CENTER} cy={CENTER} r={radius} className="transition-[r] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]" />
            </clipPath>
            <radialGradient id="xs-resin" cx=".38" cy=".34" r=".8">
              <stop offset="0" stopColor="#f5ebbd" />
              <stop offset=".7" stopColor="#e3c95b" />
              <stop offset="1" stopColor="#b8951f" />
            </radialGradient>
          </defs>

          {/* Контуры всех диаметров — тонкие направляющие */}
          {items.map((i) => (
            <circle key={i.slug} cx={CENTER} cy={CENTER} r={i.diameterMm * PX_PER_MM} fill="none" stroke="#a9b2b3" strokeWidth="1" strokeDasharray="2 6" />
          ))}

          <g clipPath="url(#xs-clip)">
            <rect width={SIZE} height={SIZE} fill="url(#xs-resin)" />
            {FIBERS.map((f, n) => (
              <circle key={n} cx={f.x} cy={f.y} r={f.r} fill="#fbf7e5" opacity={f.o} />
            ))}
          </g>

          {/* Песчаное покрытие и навивка по контуру */}
          <circle cx={CENTER} cy={CENTER} r={radius} fill="none" stroke="#735a0f" strokeWidth="5" strokeDasharray="1.5 3.5" className="transition-[r] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]" />
          <circle cx={CENTER} cy={CENTER} r={radius + 7} fill="none" stroke="#19242a" strokeWidth="1.5" className="transition-[r] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]" />

          {/* Размерная линия */}
          <g className="text-graphite-900" stroke="currentColor" strokeWidth="1.5">
            <line x1={CENTER - radius} y1={CENTER} x2={CENTER + radius} y2={CENTER} className="transition-all duration-700 ease-[cubic-bezier(.2,.8,.2,1)]" />
            <path d={`M${CENTER - radius} ${CENTER} l10 -5 v10 z M${CENTER + radius} ${CENTER} l-10 -5 v10 z`} fill="currentColor" className="transition-all duration-700" />
          </g>
          <text x={CENTER} y={CENTER - 12} textAnchor="middle" className="fill-graphite-950 font-display text-[22px] font-medium">
            {label} {t.common.mm}
          </text>
        </svg>
      </div>

      <div>
        <div className="mb-3 text-sm font-semibold text-graphite-600">{t.hero.pickDiameter}</div>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={t.hero.pickDiameter}>
          {items.map((i) => {
            const active = i.slug === item.slug;
            return (
              <button
                key={i.slug}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSlug(i.slug)}
                className={`rounded-full border py-2.5 font-display text-base transition ${active ? 'border-graphite-950 bg-graphite-950 text-white' : 'border-graphite-300 text-graphite-800 hover:border-graphite-950'}`}
              >
                {formatNumber(i.diameterMm, 1)}
              </button>
            );
          })}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-graphite-200 pt-5 text-sm">
          <div>
            <dt className="text-graphite-500">{t.product.retail}</dt>
            <dd className="mt-1"><PriceTag price={item.retail} t={t} /></dd>
          </div>
          <div>
            <dt className="text-graphite-500">{t.hero.supply}</dt>
            <dd className="mt-1 font-semibold">{item.formats || '—'}</dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <Link href={item.href} className="text-sm font-bold text-graphite-950 underline decoration-accent-500 decoration-2 underline-offset-4 hover:decoration-graphite-950">
            {t.hero.productLink} {label}
          </Link>
          <span className="text-xs text-graphite-500">{t.hero.scaleNote}</span>
        </div>
      </div>
    </div>
  );
}
