import { asc, desc } from 'drizzle-orm';
import { SubmitButton } from '@/components/admin/submit-button';
import { Flash, PageHeader, Panel, Table, Td } from '@/components/admin/ui';
import { db } from '@/db/client';
import { discountRules, promoCodes } from '@/db/schema';
import { saveDiscount, savePromo } from '@/server/admin/actions/catalog-refs';
import { requireUser } from '@/server/auth/session';

type Props = { searchParams: Promise<{ ok?: string; error?: string }> };

export default async function DiscountsPage({ searchParams }: Props) {
  await requireUser('discounts');
  const flash = await searchParams;
  const [rules, promos] = await Promise.all([
    db.select().from(discountRules).orderBy(asc(discountRules.minMeters)),
    db.select().from(promoCodes).orderBy(desc(promoCodes.active)),
  ]);

  const ruleRow = (rule?: (typeof rules)[number]) => {
    const fid = `rule-${rule?.id ?? 'new'}`;
    return (
    <>
      <Td><input form={fid} name="name" defaultValue={rule?.name} required placeholder="Название" className="field" /></Td>
      <Td><input form={fid} name="minMeters" type="number" min={0} defaultValue={rule?.minMeters} required className="field w-28" /></Td>
      <Td><input form={fid} name="percent" defaultValue={rule?.percent} required className="field w-20" /></Td>
      <Td><input form={fid} type="checkbox" name="wholesaleOnly" defaultChecked={rule?.wholesaleOnly ?? true} className="h-4 w-4 accent-accent-500" /></Td>
      <Td><input form={fid} type="checkbox" name="active" defaultChecked={rule?.active ?? true} className="h-4 w-4 accent-accent-500" /></Td>
      <Td className="whitespace-nowrap space-x-1"><form id={fid} action={saveDiscount}><input type="hidden" name="id" value={rule?.id ?? ''} /></form>
        <SubmitButton form={fid} variant="outline">{rule ? 'Сохранить' : 'Добавить'}</SubmitButton>
        {rule && <SubmitButton form={fid} variant="danger" name="intent" value="delete" confirm="Удалить правило?">×</SubmitButton>}
      </Td>
    </>
  );
  };

  const promoRow = (promo?: (typeof promos)[number]) => {
    const fid = `promo-${promo?.id ?? 'new'}`;
    return (
    <>
      <Td><input form={fid} name="code" defaultValue={promo?.code} required placeholder="КОД" className="field w-36 uppercase" /></Td>
      <Td><input form={fid} name="percent" defaultValue={promo?.percent} required className="field w-20" /></Td>
      <Td><input form={fid} name="maxUses" type="number" min={0} defaultValue={promo?.maxUses ?? ''} className="field w-24" /></Td>
      <Td>{promo?.uses ?? 0}</Td>
      <Td><input form={fid} name="expiresAt" type="date" defaultValue={promo?.expiresAt?.toISOString().slice(0, 10) ?? ''} className="field" /></Td>
      <Td><input form={fid} type="checkbox" name="active" defaultChecked={promo?.active ?? true} className="h-4 w-4 accent-accent-500" /></Td>
      <Td className="whitespace-nowrap space-x-1"><form id={fid} action={savePromo}><input type="hidden" name="id" value={promo?.id ?? ''} /></form>
        <SubmitButton form={fid} variant="outline">{promo ? 'Сохранить' : 'Добавить'}</SubmitButton>
        {promo && <SubmitButton form={fid} variant="danger" name="intent" value="delete" confirm="Удалить промокод?">×</SubmitButton>}
      </Td>
    </>
  );
  };

  return (
    <>
      <PageHeader title="Скидки и промокоды" description="Скидки применяются кодом с точной десятичной арифметикой. Действует наибольшая подходящая скидка, затем промокод." />
      <Flash {...flash} />
      <div className="space-y-6">
        <Panel title="Скидки за объём">
          <Table head={['Название', 'От, м', '%', 'Только опт', 'Активна', '']}>
            {rules.map((r) => <tr key={r.id}>{ruleRow(r)}</tr>)}
            <tr className="bg-graphite-50">{ruleRow()}</tr>
          </Table>
        </Panel>
        <Panel title="Промокоды для оптовых клиентов">
          <Table head={['Код', '%', 'Лимит', 'Использован', 'Действует до', 'Активен', '']}>
            {promos.map((p) => <tr key={p.id}>{promoRow(p)}</tr>)}
            <tr className="bg-graphite-50">{promoRow()}</tr>
          </Table>
        </Panel>
      </div>
    </>
  );
}
