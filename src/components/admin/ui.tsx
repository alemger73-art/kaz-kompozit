import Link from 'next/link';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-xl font-semibold uppercase tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-graphite-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, actions, className = '' }: { title?: string; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-graphite-200 bg-white ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-graphite-100 px-5 py-3.5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-graphite-700">{title}</h2>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string };

export function Field({ label, hint, className = '', ...props }: InputProps) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      <input {...props} className="field" />
      {hint && <span className="mt-1 block text-[11px] text-graphite-400">{hint}</span>}
    </label>
  );
}

export function TextArea({ label, hint, className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      <textarea rows={3} {...props} className="field resize-y" />
      {hint && <span className="mt-1 block text-[11px] text-graphite-400">{hint}</span>}
    </label>
  );
}

export function Select({ label, options, className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string; options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      <select {...props} className="field">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function Checkbox({ label, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-2.5 text-sm">
      <input type="checkbox" {...props} className="mt-0.5 h-4 w-4 rounded border-graphite-300 accent-accent-500" />
      <span>
        <span className="font-semibold">{label}</span>
        {hint && <span className="block text-[11px] text-graphite-400">{hint}</span>}
      </span>
    </label>
  );
}

export function Table({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-graphite-200 bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-graphite-50 text-left text-[11px] font-bold uppercase tracking-wider text-graphite-500">
          <tr>{head.map((h, i) => <th key={i} className="px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-graphite-100">
          {empty ? <tr><td colSpan={head.length} className="px-4 py-10 text-center text-graphite-400">Пока пусто</td></tr> : children}
        </tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

const badgeTones = {
  gray: 'bg-graphite-100 text-graphite-700',
  green: 'bg-emerald-50 text-emerald-700',
  orange: 'bg-accent-50 text-accent-700',
  red: 'bg-red-50 text-red-700',
  yellow: 'bg-fiber-300/30 text-fiber-600',
  blue: 'bg-sky-50 text-sky-700',
} as const;

export function Badge({ tone = 'gray', children }: { tone?: keyof typeof badgeTones; children: React.ReactNode }) {
  return <span className={`badge ${badgeTones[tone]}`}>{children}</span>;
}

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (error) return <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p>;
  if (ok) return <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">Сохранено</p>;
  return null;
}

export function LinkButton({ href, children, variant = 'outline' }: { href: string; children: React.ReactNode; variant?: 'primary' | 'outline' | 'dark' }) {
  const styles = { primary: 'btn-primary', outline: 'btn-outline', dark: 'btn-dark' };
  return <Link href={href} className={`${styles[variant]} btn-sm`}>{children}</Link>;
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-graphite-200 bg-white p-5">
      <div className="text-[11px] font-bold uppercase tracking-wider text-graphite-500">{label}</div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-graphite-400">{hint}</div>}
    </div>
  );
}

export function NotConnected({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-fiber-500 bg-fiber-300/10 p-5 text-sm">
      <div className="mb-1 flex items-center gap-2 font-bold"><Badge tone="yellow">Не подключено</Badge>{title}</div>
      <div className="text-graphite-600">{children}</div>
    </div>
  );
}
