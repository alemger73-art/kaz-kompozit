import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="bg-graphite-950 py-32 text-center text-white tech-grid">
      <p className="font-display text-7xl font-bold text-accent-500">404</p>
      <p className="mt-4 text-white/70">Страница не найдена · Бет табылмады</p>
      <Link href="/ru" className="btn-primary mt-8">На главную</Link>
    </section>
  );
}
