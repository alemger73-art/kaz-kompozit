import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/config';
import { locales } from '@/lib/i18n';
import { routes } from '@/lib/paths';
import { getPublicProducts } from '@/server/public/catalog';

export const dynamic = 'force-dynamic';

const STATIC_PATHS = [
  routes.home, routes.catalog, routes.calculator, routes.applications, routes.delivery,
  routes.wholesale, routes.projects, routes.about, routes.contacts,
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getPublicProducts();
  const entry = (path: string, lastModified?: Date, priority = 0.7): MetadataRoute.Sitemap =>
    locales.map((locale) => ({
      url: `${siteUrl}/${locale}${path}`,
      lastModified,
      priority,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}${path}`])) },
    }));

  return [
    ...STATIC_PATHS.flatMap((path) => entry(path, undefined, path === '' ? 1 : 0.8)),
    ...products.flatMap((p) => entry(routes.product(p.slug), p.updatedAt, 0.9)),
  ];
}
