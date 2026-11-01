'use client';
import { useMemo, useState } from 'react';
import { calculate, type CalcCity, type CalcDiscountRule, type CalcProduct } from '@/lib/calculator';
import type { Dictionary } from '@/lib/i18n';
import { formatNumber, formatTenge } from '@/lib/money';
import { whatsappLink } from '@/lib/paths';
import { LeadForm } from './lead-form';
import { IconWarning, IconWhatsapp } from './icons';

export type CalcOption = CalcProduct & { shortLabel: string };

type Props = {
  t: Dictionary;
  products: CalcOption[];
  cities: CalcCity[];
  rules: CalcDiscountRule[];
  whatsapp: string | null;
  initialProductId?: string;
  /** Компактный режим — для карточки товара (без выбора диаметра) */
  lockProduct?: boolean;
  dark?: boolean;
};

type Promo = { code: string; percent: string } | null;

function Row({ label, value, strong, muted }: { label: string; value: React.ReactNode; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/10 py-2.5 last:border-0">
      <dt className="text-sm text-white/60">{label}</dt>
      <dd className={`text-right ${strong ? 'font-display text-xl font-semibold text-white' : 'text-sm font-semibold'} ${muted ? 'text-white/50' : 'text-white'}`}>
        {value}
      </dd>
    </div>
  );
}

export function Calculator({ t, products, cities, rules, whatsapp, initialProductId, lockProduct, dark = true }: Props) {
  const c = t.calc;
  const [productId, setProductId] = useState(initialProductId ?? products[0]?.id ?? '');
  const [meters, setMeters] = useState('');
  const [coils, setCoils] = useState('');
  const [bars, setBars] = useState('');
  const [citySlug, setCitySlug] = useState(cities[0]?.slug ?? '');
  const [buyerType, setBuyerType] = useState<'PRIVATE' | 'WHOLESALE'>('PRIVATE');
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<Promo>(null);
  const [promoError, setPromoError] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const product = products.find((p) => p.id === productId) ?? products[0];
  const city = cities.find((x) => x.slug === citySlug) ?? null;

  const input = useMemo(() => ({
    meters: meters || 0,
    coils: Number(coils) || 0,
    bars: Number(bars) || 0,
    buyerType,
    promoPercent: promo?.percent ?? null,
  }), [meters, coils, bars, buyerType, promo]);

  const result = useMemo(
    () => (product ? calculate(product, city, rules, input) : null),
    [product, city, rules, input],
  );

  if (!product || !result) return null;

  async function applyPromo() {
    setPromoError(false);
    const response = await fetch(`/api/promo?code=${encodeURIComponent(promoInput.trim())}`);
    if (!response.ok) {
      setPromo(null);
      setPromoError(true);
      return;
    }
    setPromo((await response.json()) as Promo);
  }

  const hasVolume = Number(result.totalMeters) > 0;

  function summaryText(): string {
    const lines = [
      `${product.name}`,
      `${c.totalMeters}: ${formatNumber(result!.totalMeters)} ${t.common.meters}`,
      `${c.city}: ${city?.name ?? '—'}`,
      `${c.buyerType}: ${buyerType === 'WHOLESALE' ? c.wholesale : c.private}`,
    ];
    if (result!.goodsTotal) lines.push(`${c.goodsTotal}: ${formatTenge(result!.goodsTotal)}`);
    lines.push(result!.grandTotal ? `${c.grandTotal}: ${formatTenge(result!.grandTotal)}` : c.deliveryManager);
    return lines.join('\n');
  }

  const waHref = whatsappLink(whatsapp, hasVolume ? summaryText() : undefined);
  const label = 'field-label !text-graphite-500';

  return (
    <div className={`grid overflow-hidden rounded-2xl lg:grid-cols-[1.15fr_1fr] ${dark ? 'border border-graphite-800' : 'border border-graphite-200'}`}>
      <div className="space-y-5 bg-white p-6 text-graphite-900 sm:p-8">
        {!lockProduct && (
          <div>
            <span className={label}>{c.diameter}</span>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={c.diameter}>
              {products.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  role="radio"
                  aria-checked={p.id === productId}
                  onClick={() => setProductId(p.id)}
                  className={`rounded-md border px-2 py-3 text-center font-display text-sm font-semibold transition ${p.id === productId ? 'border-accent-500 bg-accent-500 text-white' : 'border-graphite-200 hover:border-graphite-900'}`}
                >
                  {p.shortLabel}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className={label}>{c.meters}</span>
            <input value={meters} onChange={(e) => setMeters(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))} inputMode="decimal" placeholder="0" className="field" />
          </label>
          <label className="block">
            <span className={label}>{c.coils}</span>
            <input value={coils} onChange={(e) => setCoils(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="0" disabled={!product.coilLengthM} className="field disabled:bg-graphite-50" />
            {product.coilLengthM && <span className="mt-1 block text-[11px] text-graphite-400">{c.coilOf} {product.coilLengthM} {t.common.meters}</span>}
          </label>
          <label className="block">
            <span className={label}>{c.bars}</span>
            <input value={bars} onChange={(e) => setBars(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="0" disabled={!product.barLengthM} className="field disabled:bg-graphite-50" />
            {product.barLengthM && <span className="mt-1 block text-[11px] text-graphite-400">{c.barOf} {formatNumber(product.barLengthM)} {t.common.meters}</span>}
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>{c.city}</span>
            <select value={citySlug} onChange={(e) => setCitySlug(e.target.value)} className="field">
              {cities.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}
            </select>
          </label>
          <div>
            <span className={label}>{c.buyerType}</span>
            <div className="grid grid-cols-2 gap-2">
              {(['PRIVATE', 'WHOLESALE'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setBuyerType(type)}
                  aria-pressed={buyerType === type}
                  className={`rounded-md border px-3 py-2.5 text-sm font-bold transition ${buyerType === type ? 'border-graphite-900 bg-graphite-900 text-white' : 'border-graphite-200 hover:border-graphite-900'}`}
                >
                  {type === 'PRIVATE' ? c.private : c.wholesale}
                </button>
              ))}
            </div>
          </div>
        </div>

        {buyerType === 'WHOLESALE' && (
          <div>
            <span className={label}>{c.promo}</span>
            <div className="flex gap-2">
              <input value={promoInput} onChange={(e) => setPromoInput(e.target.value)} className="field uppercase" maxLength={40} />
              <button type="button" onClick={applyPromo} disabled={!promoInput.trim()} className="btn-outline shrink-0">{c.promoApply}</button>
            </div>
            {promo && <p className="mt-1 text-xs font-semibold text-emerald-700">{c.promoOk}: −{promo.percent}%</p>}
            {promoError && <p className="mt-1 text-xs font-semibold text-red-600">{c.promoBad}</p>}
          </div>
        )}
      </div>

      <div className="flex flex-col bg-graphite-950 p-6 text-white tech-grid sm:p-8" aria-live="polite">
        <dl className="flex-1">
          <Row label={c.totalMeters} value={`${formatNumber(result.totalMeters)} ${t.common.meters}`} />
          <Row
            label={c.pricePerMeter}
            value={result.pricePerMeter
              ? <>{formatTenge(result.pricePerMeter)}{result.priceIsDemo && <span className="ml-2 badge bg-fiber-400/20 text-fiber-300">{t.common.demo}</span>}</>
              : t.common.priceOnRequest}
          />
          <Row label={c.preliminary} value={result.subtotal && hasVolume ? formatTenge(result.subtotal) : '—'} />
          <Row
            label={Number(result.discountPercent) > 0 ? c.discount : c.discountPossible}
            value={Number(result.discountPercent) > 0 && result.discountAmount
              ? `−${formatNumber(result.discountPercent)}% (−${formatTenge(result.discountAmount)})`
              : buyerType === 'WHOLESALE' && rules.length > 0
                ? `${Math.min(...rules.map((r) => r.minMeters)).toLocaleString('ru-RU')}+ ${t.common.meters}`
                : '—'}
            muted={Number(result.discountPercent) === 0}
          />
          <Row label={c.mass} value={result.massKg ? `${formatNumber(result.massKg)} ${t.common.kg}` : c.massUnknown} muted={!result.massKg} />
          <Row label={c.delivery} value={result.delivery.cost ? formatTenge(result.delivery.cost) : c.deliveryManager} muted={!result.delivery.cost} />
          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-white/50">{c.grandTotal}</div>
            <div className="mt-1 font-display text-3xl font-semibold text-accent-400">
              {result.grandTotal ? formatTenge(result.grandTotal) : '—'}
            </div>
            {!result.grandTotal && <p className="mt-1 text-xs text-white/50">{c.grandTotalPending}</p>}
          </div>
        </dl>

        {result.belowMinOrder && (
          <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-fiber-300"><IconWarning className="h-4 w-4" />{c.belowMin}: {product.minOrderM} {t.common.meters}</p>
        )}
        {result.priceIsDemo && <p className="mt-3 text-[11px] text-white/40">{t.common.demoPriceNote}</p>}

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button type="button" className="btn-primary" disabled={!hasVolume} onClick={() => setShowForm(true)}>{c.saveRequest}</button>
          {waHref ? (
            <a href={waHref} target="_blank" rel="noopener noreferrer" className={`btn-ghost-light ${hasVolume ? '' : 'pointer-events-none opacity-50'}`}>
              <IconWhatsapp className="h-4 w-4" />{c.sendWhatsapp}
            </a>
          ) : (
            <span className="btn-ghost-light cursor-not-allowed opacity-50" title={c.whatsappMissing}><IconWhatsapp className="h-4 w-4" />WhatsApp</span>
          )}
        </div>

        {showForm && hasVolume && (
          <div className="mt-6 border-t border-white/10 pt-6">
            <LeadForm
              t={t}
              dark
              source="CALCULATOR"
              buyerType={buyerType}
              fields={buyerType === 'WHOLESALE' ? ['company', 'message'] : ['message']}
              getPayload={() => ({
                items: [{ productId: product.id, meters: meters || '0', coils: Number(coils) || 0, bars: Number(bars) || 0 }],
                citySlug,
                promoCode: promo?.code ?? null,
              })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
