'use client';
import { useState } from 'react';
import type { Dictionary } from '@/lib/i18n';
import { formatTenge } from '@/lib/money';
import { LeadForm } from './lead-form';
import { IconTruck } from './icons';

export type DeliveryCityView = {
  slug: string;
  name: string;
  region: string | null;
  tariff: string | null;
  tariffConfirmed: boolean;
  leadTime: string | null;
  mapX: number | null;
  mapY: number | null;
};

/** Упрощённый контур Казахстана для схемы (не картографическая точность). */
const KZ_OUTLINE =
  'M60 250 L110 190 L180 150 L230 120 L300 105 L380 60 L470 62 L560 88 L650 108 L760 150 L830 170 L900 205 L960 238 ' +
  'L920 290 L870 330 L820 380 L760 410 L690 432 L600 422 L520 442 L430 452 L380 412 L330 382 L280 362 L230 402 ' +
  'L180 420 L140 382 L100 402 L70 352 L40 300 Z';

const toPoint = (city: DeliveryCityView) => ({ x: (city.mapX ?? 0) * 10, y: (city.mapY ?? 0) * 5 });

export function DeliveryExplorer({ t, cities, hubSlug = 'karaganda' }: { t: Dictionary; cities: DeliveryCityView[]; hubSlug?: string }) {
  const [selected, setSelected] = useState(cities.find((c) => c.slug !== hubSlug)?.slug ?? cities[0]?.slug);
  const city = cities.find((c) => c.slug === selected);
  const hub = cities.find((c) => c.slug === hubSlug);
  const mapped = cities.filter((c) => c.mapX !== null && c.mapY !== null);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="card overflow-hidden bg-graphite-950 p-4 sm:p-6">
        <svg viewBox="0 0 1000 500" className="h-auto w-full" role="img" aria-label={t.delivery.title}>
          <path d={KZ_OUTLINE} fill="#1f2327" stroke="#3d434a" strokeWidth="2" />
          {hub && city && city.slug !== hub.slug && city.mapX !== null && (
            <line
              x1={toPoint(hub).x} y1={toPoint(hub).y} x2={toPoint(city).x} y2={toPoint(city).y}
              stroke="#ff5b14" strokeWidth="3" strokeDasharray="10 8"
            >
              <animate attributeName="stroke-dashoffset" from="36" to="0" dur="1s" repeatCount="indefinite" />
            </line>
          )}
          {mapped.map((c) => {
            const { x, y } = toPoint(c);
            const active = c.slug === selected;
            const isHub = c.slug === hubSlug;
            return (
              <g key={c.slug} onClick={() => setSelected(c.slug)} className="cursor-pointer">
                <circle cx={x} cy={y} r={isHub ? 14 : active ? 11 : 8} fill={isHub ? '#ff5b14' : active ? '#fff' : '#868e97'} />
                {isHub && <circle cx={x} cy={y} r="24" fill="none" stroke="#ff5b14" strokeOpacity=".4" strokeWidth="2" />}
                <text x={x} y={y - 20} textAnchor="middle" fontSize="20" fontWeight="700" fill={active || isHub ? '#fff' : '#b0b6bd'} fontFamily="Manrope Variable, sans-serif">
                  {c.name}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="mt-4 flex flex-wrap gap-2">
          {cities.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setSelected(c.slug)}
              aria-pressed={c.slug === selected}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${c.slug === selected ? 'border-accent-500 bg-accent-500 text-graphite-950' : 'border-white/15 text-white/70 hover:border-white hover:text-white'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {city && (
        <div className="card flex flex-col p-6 sm:p-8">
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-accent-50 text-accent-600"><IconTruck /></span>
          <h3 className="mt-4 font-display text-2xl font-medium tracking-tight">{city.name}</h3>
          {city.region && <p className="text-sm text-graphite-500">{city.region}</p>}
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-graphite-100 pb-3">
              <dt className="text-graphite-500">{t.delivery.tariff}</dt>
              <dd className="text-right font-bold">
                {city.tariffConfirmed && city.tariff ? formatTenge(city.tariff) : t.calc.deliveryManager}
              </dd>
            </div>
            {city.leadTime && (
              <div className="flex justify-between gap-4">
                <dt className="text-graphite-500">{t.product.leadTime}</dt>
                <dd className="text-right font-semibold">{city.leadTime}</dd>
              </div>
            )}
          </dl>
          <div className="mt-8 border-t border-graphite-100 pt-6">
            <h4 className="mb-4 text-sm font-semibold">{t.delivery.formTitle}</h4>
            <LeadForm key={city.slug} t={t} source="DELIVERY" fields={['message']} getPayload={() => ({ citySlug: city.slug })} />
          </div>
        </div>
      )}
    </div>
  );
}
