type Props = {
  id?: string;
  /** Оставлено для совместимости: подписи над заголовками не выводятся. */
  eyebrow?: string;
  title?: string;
  intro?: string;
  tone?: 'light' | 'muted' | 'dark';
  children: React.ReactNode;
  action?: React.ReactNode;
};

const tones = {
  light: 'bg-white',
  muted: 'bg-graphite-50 tech-grid-light',
  dark: 'bg-graphite-950 text-white tech-grid',
};

export function Section({ id, title, intro, tone = 'light', children, action }: Props) {
  return (
    <section id={id} className={`${tones[tone]} py-16 sm:py-24`}>
      <div className="container-site">
        {title && (
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-3">
              <h2 className="h-section">{title}</h2>
              {intro && <p className={tone === 'dark' ? 'text-white/60' : 'text-graphite-500'}>{intro}</p>}
            </div>
            {action}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export function PageHero({ title, intro, children }: { eyebrow?: string; title: string; intro?: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-graphite-950 text-white tech-grid">
      <div className="container-site py-14 sm:py-20">
        <h1 className="h-display max-w-4xl text-[clamp(1.75rem,6.5vw,3.5rem)] [overflow-wrap:anywhere]">{title}</h1>
        {intro && <p className="mt-5 max-w-2xl text-white/60 sm:text-lg">{intro}</p>}
        {children}
      </div>
      <div className="absolute bottom-0 left-0 h-1 w-32 bg-accent-500" />
    </section>
  );
}

export function WarningNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-fiber-400/60 bg-fiber-300/15 p-4 text-sm text-graphite-800" role="note">
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-fiber-600" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l9 16H3zM12 10v4M12 17v.5" /></svg>
      <div>{children}</div>
    </div>
  );
}
