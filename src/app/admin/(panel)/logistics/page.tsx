import { asc } from 'drizzle-orm';
import { SubmitButton } from '@/components/admin/submit-button';
import { Flash, PageHeader, Panel, Table, Td } from '@/components/admin/ui';
import { db } from '@/db/client';
import { deliveryCities, logisticsPartners } from '@/db/schema';
import { saveCity, savePartner } from '@/server/admin/actions/catalog-refs';
import { requireUser } from '@/server/auth/session';

type City = typeof deliveryCities.$inferSelect;
type Partner = typeof logisticsPartners.$inferSelect;

const check = (form: string, name: string, checked?: boolean) => <input form={form} type="checkbox" name={name} defaultChecked={checked} className="h-4 w-4 accent-accent-500" />;

function CityRow({ city }: { city?: City }) {
  const fid = `city-${city?.id ?? 'new'}`;
  return (
    <>
      <Td><input form={fid} name="nameRu" defaultValue={city?.nameRu} required placeholder="Город" className="field w-36" /><input form={fid} name="nameKk" defaultValue={city?.nameKk} required placeholder="Қала" className="field mt-1 w-36" /></Td>
      <Td><input form={fid} name="slug" defaultValue={city?.slug} required pattern="[a-z0-9-]+" placeholder="kod" className="field w-28" /></Td>
      <Td><input form={fid} name="tariff" defaultValue={city?.tariff ?? ''} inputMode="decimal" placeholder="—" className="field w-28" /></Td>
      <Td>{check(fid, 'tariffConfirmed', city?.tariffConfirmed)}</Td>
      <Td><input form={fid} name="leadTimeRu" defaultValue={city?.leadTimeRu ?? ''} className="field w-44" /></Td>
      <Td><div className="flex gap-1"><input form={fid} name="mapX" defaultValue={city?.mapX ?? ''} placeholder="X" className="field w-14" /><input form={fid} name="mapY" defaultValue={city?.mapY ?? ''} placeholder="Y" className="field w-14" /></div></Td>
      <Td><input form={fid} name="sort" type="number" defaultValue={city?.sort ?? 0} className="field w-16" /></Td>
      <Td>{check(fid, 'active', city?.active ?? true)}</Td>
      <Td><form id={fid} action={saveCity}><input type="hidden" name="id" value={city?.id ?? ''} /></form><input form={fid} type="hidden" name="regionRu" value={city?.regionRu ?? ''} /><SubmitButton form={fid} variant="outline">{city ? 'OK' : '+'}</SubmitButton></Td>
    </>
  );
}

function PartnerRow({ partner }: { partner?: Partner }) {
  const fid = `partner-${partner?.id ?? 'new'}`;
  return (
    <>
      <Td><input form={fid} name="name" defaultValue={partner?.name} required placeholder="Транспортная компания" className="field" /></Td>
      <Td><input form={fid} name="phone" defaultValue={partner?.phone ?? ''} className="field w-36" /></Td>
      <Td><input form={fid} name="notes" defaultValue={partner?.notes ?? ''} className="field" /></Td>
      <Td>{check(fid, 'verified', partner?.verified)}</Td>
      <Td>{check(fid, 'published', partner?.published)}</Td>
      <Td><form id={fid} action={savePartner}><input type="hidden" name="id" value={partner?.id ?? ''} /></form><SubmitButton form={fid} variant="outline">{partner ? 'OK' : '+'}</SubmitButton></Td>
    </>
  );
}

export default async function LogisticsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireUser('logistics');
  const flash = await searchParams;
  const [cities, partners] = await Promise.all([
    db.select().from(deliveryCities).orderBy(asc(deliveryCities.sort)),
    db.select().from(logisticsPartners),
  ]);

  return (
    <>
      <PageHeader title="Логистика" description="Пока тариф не подтверждён, клиенты видят «Доставка рассчитывается менеджером». X/Y — положение точки на схеме (0–100)." />
      <Flash {...flash} />
      <div className="space-y-6">
        <Panel title="Города доставки">
          <Table head={['Город (рус./каз.)', 'Код', 'Тариф за рейс, ₸', 'Подтверждён', 'Срок', 'Карта X/Y', 'Порядок', 'Активен', '']}>
            {cities.map((c) => <tr key={c.id}><CityRow city={c} /></tr>)}
            <tr className="bg-graphite-50"><CityRow /></tr>
          </Table>
        </Panel>
        <Panel title="Транспортные партнёры">
          <Table head={['Название', 'Телефон', 'Заметки', 'Проверен', 'Показывать на сайте', '']}>
            {partners.map((p) => <tr key={p.id}><PartnerRow partner={p} /></tr>)}
            <tr className="bg-graphite-50"><PartnerRow /></tr>
          </Table>
          <p className="mt-3 text-xs text-graphite-500">На сайте публикуется только партнёр, отмеченный как проверенный.</p>
        </Panel>
      </div>
    </>
  );
}
