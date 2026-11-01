import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { SubmitButton } from '@/components/admin/submit-button';
import { Badge, LinkButton, PageHeader, Table, Td } from '@/components/admin/ui';
import { db } from '@/db/client';
import { categories, products } from '@/db/schema';
import { formatNumber } from '@/lib/money';
import { toggleProductPublished } from '@/server/admin/actions/products';
import { can, requireUser } from '@/server/auth/session';

const AVAILABILITY = { IN_STOCK: 'В наличии', ON_ORDER: 'Под заказ', OUT_OF_STOCK: 'Нет' } as const;

export default async function ProductsPage() {
  const user = await requireUser('products');
  const editable = can(user, 'productsEdit');
  const rows = await db.select({
    id: products.id, nameRu: products.nameRu, slug: products.slug, diameterMm: products.diameterMm,
    availability: products.availability, stockM: products.stockM, published: products.published, category: categories.nameRu,
  }).from(products).innerJoin(categories, eq(categories.id, products.categoryId)).orderBy(asc(products.sort));

  return (
    <>
      <PageHeader title="Товары" description="Каталог управляется отсюда. Цены — в разделах «Цены»." actions={editable && <LinkButton href="/admin/products/new" variant="primary">+ Добавить товар</LinkButton>} />
      <Table head={['Товар', 'Категория', 'Диаметр', 'Наличие', 'Остаток', 'Статус', '']} empty={rows.length === 0}>
        {rows.map((p) => (
          <tr key={p.id}>
            <Td><Link href={`/admin/products/${p.id}`} className="font-bold hover:text-accent-600">{p.nameRu}</Link><div className="text-[11px] text-graphite-400">/{p.slug}</div></Td>
            <Td>{p.category}</Td>
            <Td>{p.diameterMm ? `${formatNumber(p.diameterMm, 1)} мм` : '—'}</Td>
            <Td>{AVAILABILITY[p.availability]}</Td>
            <Td>{p.stockM !== null ? `${p.stockM} м` : '—'}</Td>
            <Td>{p.published ? <Badge tone="green">На сайте</Badge> : <Badge>Скрыт</Badge>}</Td>
            <Td>
              {editable && (
                <form action={toggleProductPublished}>
                  <input type="hidden" name="id" value={p.id} />
                  <SubmitButton variant="outline">{p.published ? 'Скрыть' : 'Показать'}</SubmitButton>
                </form>
              )}
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
