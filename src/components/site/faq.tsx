import { pick, type Locale } from '@/lib/i18n';
import { jsonLd } from '@/lib/seo';

type FaqRow = { id: string; qRu: string; aRu: string; qKk: string; aKk: string };

export function Faq({ items, locale }: { items: FaqRow[]; locale: Locale }) {
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: pick(item, 'q', locale),
      acceptedAnswer: { '@type': 'Answer', text: pick(item, 'a', locale) },
    })),
  };
  return (
    <div className="divide-y divide-graphite-200 border-y border-graphite-200">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      {items.map((item) => (
        <details key={item.id} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-bold [&::-webkit-details-marker]:hidden">
            {pick(item, 'q', locale)}
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-graphite-200 text-lg transition group-open:rotate-45 group-open:border-accent-500 group-open:text-accent-500">+</span>
          </summary>
          <p className="mt-3 max-w-3xl leading-relaxed text-graphite-600">{pick(item, 'a', locale)}</p>
        </details>
      ))}
    </div>
  );
}
