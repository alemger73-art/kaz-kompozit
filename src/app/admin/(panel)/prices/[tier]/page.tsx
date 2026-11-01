import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/admin/submit-button';
import { Flash, PageHeader, Table, Td } from '@/components/admin/ui';
import { db } from '@/db/client';
import { products, purchasePrices, salePrices, suppliers } from '@/db/schema';
import { dec, formatTenge } from '@/lib/money';
import { savePurchasePrices, saveSalePrices } from '@/server/admin/actions/prices';
import { can, requireUser } from '@/server/auth/session';

const TIERS = {
  purchase: { title: 'Закупочные цены', description: 'ВНУТРЕННИЕ данные. Не показываются клиентам, в API, КП и журналах.' },
  retail: { title: 'Розничные цены', description: 'Цена для частных покупателей. На сайте показывается только утверждённая цена; демо — только в тестовом режиме.' },
  wholesale: { title: 'Оптовые цены', description: 'Цена для оптовых покупателей. Правила те же, что и для розницы.' },
} as const;

type Props = { params: Promise<{ tier: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

function marginPercent(sale: string | null, purchase: string | undefined): string {
  if (!sale || !purchase || dec(sale).isZero()) return '—';
  return `${dec(sale).minus(purchase).div(sale).mul(100).toDecimalPlaces(1).toString()}%`;
}

export default async function PricesPage({ params, searchParams }: Props) {
  const { tier } = await params;
  if (!(tier in TIERS)) notFound();
  const user = await requireUser('purchasePricesView');
  const flash = await searchParams;
  const config = TIERS[tier as keyof typeof TIERS];

  const [items, purchase, sale, supplierList] = await Promise.all([
    db.select({ id: products.id, nameRu: products.nameRu }).from(products).orderBy(asc(products.sort)),
    db.select().from(purchasePrices),
    db.select().from(salePrices),
    db.select({ id: suppliers.id, name: suppliers.name }).from(suppliers),
  ]);
  const purchaseOf = (id: string) => purchase.find((p) => p.productId === id);
  const tabs = (
    <div className="flex gap-1 rounded-lg bg-graphite-100 p-1 text-xs font-bold">
      {Object.entries(TIERS).map(([key, value]) => (
        <Link key={key} href={`/admin/prices/${key}`} className={`rounded-md px-3 py-1.5 ${key === tier ? 'bg-white shadow-sm' : 'text-graphite-500'}`}>{value.title}</Link>
      ))}
    </div>
  );

  if (tier === 'purchase') {
    const editable = can(user, 'purchasePricesEdit');
    return (
      <>
        <PageHeader title={config.title} description={config.description} actions={tabs} />
        <Flash {...flash} />
        <form action={savePurchasePrices} className="space-y-4">
          <fieldset disabled={!editable}>
            <Table head={['Товар', 'Закупка, ₸/м', 'Поставщик', 'Обновлено']}>
              {items.map((p) => {
                const row = purchaseOf(p.id);
                return (
                  <tr key={p.id}>
                    <Td className="font-semibold">{p.nameRu}</Td>
                    <Td><input name={`price_${p.id}`} defaultValue={row?.pricePerMeter ?? ''} inputMode="decimal" className="field w-32" /></Td>
                    <Td>
                      <select name={`supplier_${p.id}`} defaultValue={row?.supplierId ?? ''} className="field">
                        <option value="">—</option>
                        {supplierList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </Td>
                    <Td className="text-xs text-graphite-500">{row ? row.updatedAt.toLocaleDateString('ru-RU') : '—'}</Td>
                  </tr>
                );
              })}
            </Table>
          </fieldset>
          {editable && <SubmitButton>Сохранить закупочные цены</SubmitButton>}
        </form>
      </>
    );
  }

  const dbTier = tier === 'wholesale' ? 'WHOLESALE' : 'RETAIL';
  const editable = can(user, 'salePricesEdit');
  return (
    <>
      <PageHeader title={config.title} description={config.description} actions={tabs} />
      <Flash {...flash} />
      <form action={saveSalePrices} className="space-y-4">
        <input type="hidden" name="tier" value={dbTier} />
        <fieldset disabled={!editable}>
          <Table head={['Товар', 'Цена, ₸/м', 'Утверждена', 'Демо', 'Закупка', 'Наценка от цены']}>
            {items.map((p) => {
              const row = sale.find((s) => s.productId === p.id && s.tier === dbTier);
              const cost = purchaseOf(p.id)?.pricePerMeter;
              return (
                <tr key={p.id}>
                  <Td className="font-semibold">{p.nameRu}</Td>
                  <Td><input name={`price_${p.id}`} defaultValue={row?.pricePerMeter ?? ''} inputMode="decimal" className="field w-32" /></Td>
                  <Td><input type="checkbox" name={`approved_${p.id}`} defaultChecked={row?.approved} className="h-4 w-4 accent-accent-500" /></Td>
                  <Td><input type="checkbox" name={`demo_${p.id}`} defaultChecked={row?.demo} className="h-4 w-4 accent-accent-500" /></Td>
                  <Td className="text-graphite-500">{cost ? formatTenge(cost) : '—'}</Td>
                  <Td className="font-semibold">{marginPercent(row?.pricePerMeter ?? null, cost)}</Td>
                </tr>
              );
            })}
          </Table>
        </fieldset>
        <p className="text-xs text-graphite-500">«Утверждена» — цена видна всем клиентам. «Демо» — видна только в тестовом режиме с пометкой. Без отметок — на сайте «Цена по запросу».</p>
        {editable && <SubmitButton>Сохранить цены</SubmitButton>}
      </form>
    </>
  );
}
