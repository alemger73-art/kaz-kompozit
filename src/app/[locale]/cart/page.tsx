import type { Metadata } from 'next';
import { CartView } from '@/components/site/cart-view';
import { PageHero } from '@/components/site/section';
import { getDictionary, pick, type Locale } from '@/lib/i18n';
import { localePath, routes } from '@/lib/paths';
import { getPublicProducts } from '@/server/public/catalog';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDictionary(locale).seo.cartTitle, robots: { index: false } };
}

export default async function CartPage({ params }: Props) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const products = await getPublicProducts();

  return (
    <>
      <PageHero title={t.cart.title} />
      <section className="bg-graphite-50 py-12 sm:py-16">
        <div className="container-site">
          <CartView
            t={t}
            products={products.map((p) => ({
              id: p.id, name: pick(p, 'name', locale), href: localePath(locale, routes.product(p.slug)),
              retail: p.retail, minOrderM: p.minOrderM, coilLengthM: p.coilLengthM,
            }))}
          />
        </div>
      </section>
    </>
  );
}
