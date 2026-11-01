'use client';
import { useState } from 'react';
import type { Dictionary } from '@/lib/i18n';
import type { LeadSource } from '@/db/schema';
import { interpolate } from '@/lib/i18n/format';
import { IconCheck } from './icons';

type Field = 'email' | 'company' | 'bin' | 'city' | 'message' | 'file';

type Props = {
  t: Dictionary;
  source: LeadSource;
  fields?: Field[];
  buyerType?: 'PRIVATE' | 'WHOLESALE';
  /** Постоянные данные заявки (например, товар) — можно передавать из серверного компонента. */
  payload?: unknown;
  /** Данные, собираемые в момент отправки (расчёт, корзина) — только из клиентских компонентов. */
  getPayload?: () => unknown;
  submitLabel?: string;
  defaultMessage?: string;
  dark?: boolean;
  onSuccess?: (leadNumber: number) => void;
};

type State = { status: 'idle' | 'sending' | 'error' } | { status: 'done'; number: number };

export function LeadForm({
  t, source, fields = ['message'], buyerType = 'PRIVATE', payload, getPayload, submitLabel, defaultMessage, dark, onSuccess,
}: Props) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const label = `field-label ${dark ? '!text-white/60' : ''}`;
  const has = (field: Field) => fields.includes(field);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: 'sending' });
    const data = new FormData(event.currentTarget);
    data.set('source', source);
    data.set('buyerType', buyerType);
    data.set('locale', t.locale);
    const extra = getPayload ? getPayload() : payload;
    if (extra) data.set('payload', JSON.stringify(extra));
    try {
      const response = await fetch('/api/leads', { method: 'POST', body: data });
      if (!response.ok) throw new Error(String(response.status));
      const result = (await response.json()) as { number: number };
      setState({ status: 'done', number: result.number });
      onSuccess?.(result.number);
    } catch {
      setState({ status: 'error' });
    }
  }

  if (state.status === 'done') {
    return (
      <div className={`flex items-start gap-3 rounded-lg p-5 ${dark ? 'bg-white/10 text-white' : 'bg-accent-50 text-graphite-900'}`} role="status">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-500 text-graphite-950"><IconCheck /></span>
        <p className="pt-1 text-sm font-semibold">{interpolate(t.form.success, { n: state.number })}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {/* Ловушка для ботов: поле скрыто от людей */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <label className="block">
        <span className={label}>{t.form.name} *</span>
        <input name="name" required maxLength={120} className="field" autoComplete="name" />
      </label>
      <label className="block">
        <span className={label}>{t.form.phone} *</span>
        <input name="phone" required type="tel" inputMode="tel" minLength={10} maxLength={20} placeholder="+7 7__ ___ __ __" className="field" autoComplete="tel" />
      </label>
      {has('email') && (
        <label className="block"><span className={label}>{t.form.email}</span>
          <input name="email" type="email" maxLength={160} className="field" autoComplete="email" /></label>
      )}
      {has('company') && (
        <label className="block"><span className={label}>{t.form.company}</span>
          <input name="company" maxLength={200} className="field" autoComplete="organization" /></label>
      )}
      {has('bin') && (
        <label className="block"><span className={label}>{t.form.bin}</span>
          <input name="bin" inputMode="numeric" pattern="\d{12}" maxLength={12} className="field" /></label>
      )}
      {has('city') && (
        <label className="block"><span className={label}>{t.form.city}</span>
          <input name="city" maxLength={120} className="field" /></label>
      )}
      {has('message') && (
        <label className="block sm:col-span-2"><span className={label}>{t.form.message}</span>
          <textarea name="message" rows={3} maxLength={3000} defaultValue={defaultMessage} className="field resize-y" /></label>
      )}
      {has('file') && (
        <label className="block sm:col-span-2"><span className={label}>{t.form.file}</span>
          <input name="file" type="file" accept=".xlsx,.csv,.pdf" className="field file:mr-3 file:rounded file:border-0 file:bg-graphite-900 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white" /></label>
      )}
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
        <button type="submit" className="btn-primary" disabled={state.status === 'sending'}>
          {state.status === 'sending' ? t.common.sending : submitLabel ?? t.common.send}
        </button>
        <p className={`text-xs ${dark ? 'text-white/50' : 'text-graphite-400'}`}>{t.form.consent}</p>
      </div>
      {state.status === 'error' && <p className="text-sm font-semibold text-red-600 sm:col-span-2" role="alert">{t.form.error}</p>}
    </form>
  );
}
