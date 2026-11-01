import type { Metadata } from 'next';
import { siteUrl } from './config';
import type { Locale } from './i18n';

type MetaInput = {
  locale: Locale;
  /** Путь без префикса языка, например «/catalog» */
  path: string;
  title: string;
  description: string;
  image?: string | null;
  override?: { titleRu: string | null; descRu: string | null; titleKk: string | null; descKk: string | null } | null;
};

export function buildMetadata({ locale, path, title, description, image, override }: MetaInput): Metadata {
  const finalTitle = (locale === 'kk' ? override?.titleKk : override?.titleRu) || title;
  const finalDesc = (locale === 'kk' ? override?.descKk : override?.descRu) || description;
  const url = `${siteUrl}/${locale}${path}`;
  return {
    title: finalTitle,
    description: finalDesc,
    alternates: {
      canonical: url,
      languages: { ru: `${siteUrl}/ru${path}`, kk: `${siteUrl}/kk${path}`, 'x-default': `${siteUrl}/ru${path}` },
    },
    openGraph: {
      title: finalTitle,
      description: finalDesc,
      url,
      type: 'website',
      locale: locale === 'kk' ? 'kk_KZ' : 'ru_KZ',
      images: [{ url: image ?? `${siteUrl}/og.png`, width: 1200, height: 630 }],
    },
  };
}

/** JSON-LD как безопасная строка для <script type="application/ld+json">. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
