import { asc } from 'drizzle-orm';
import { SubmitButton } from '@/components/admin/submit-button';
import { Badge, Checkbox, Field, Flash, PageHeader, Panel, TextArea } from '@/components/admin/ui';
import { db } from '@/db/client';
import { suppliers } from '@/db/schema';
import { saveSupplier } from '@/server/admin/actions/catalog-refs';
import { requireUser } from '@/server/auth/session';

type Supplier = typeof suppliers.$inferSelect;

function SupplierForm({ supplier }: { supplier?: Supplier }) {
  return (
    <form action={saveSupplier} className="grid gap-3 md:grid-cols-3">
      <input type="hidden" name="id" value={supplier?.id ?? ''} />
      <Field label="Название" name="name" required defaultValue={supplier?.name} />
      <Field label="Контактное лицо" name="contactName" defaultValue={supplier?.contactName ?? ''} />
      <Field label="Город" name="city" defaultValue={supplier?.city ?? ''} />
      <Field label="Телефон" name="phone" defaultValue={supplier?.phone ?? ''} />
      <Field label="E-mail" name="email" type="email" defaultValue={supplier?.email ?? ''} />
      <Field label="Прайс обновлён" name="priceListUpdatedAt" type="date" defaultValue={supplier?.priceListUpdatedAt?.toISOString().slice(0, 10) ?? ''} />
      <TextArea className="md:col-span-2" label="Заметки" name="notes" defaultValue={supplier?.notes ?? ''} />
      <div className="space-y-3 md:pt-6">
        <Checkbox label="Проверенный поставщик" name="verified" defaultChecked={supplier?.verified} />
        <SubmitButton variant={supplier ? 'outline' : 'primary'}>{supplier ? 'Сохранить' : 'Добавить поставщика'}</SubmitButton>
      </div>
    </form>
  );
}

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireUser('suppliers');
  const flash = await searchParams;
  const list = await db.select().from(suppliers).orderBy(asc(suppliers.name));
  const staleBefore = Date.now() - 30 * 24 * 3600 * 1000;

  return (
    <>
      <PageHeader title="Поставщики" description="Прайс старше 30 дней подсвечивается — агент по поставщикам предложит запросить подтверждение." />
      <Flash {...flash} />
      <div className="space-y-4">
        {list.map((s) => (
          <Panel key={s.id} title={s.name} actions={
            <div className="flex gap-1">
              {s.verified ? <Badge tone="green">Проверен</Badge> : <Badge tone="yellow">Не проверен</Badge>}
              {(!s.priceListUpdatedAt || s.priceListUpdatedAt.getTime() < staleBefore) && <Badge tone="red">Прайс устарел</Badge>}
            </div>
          }>
            <SupplierForm supplier={s} />
          </Panel>
        ))}
        <Panel title="Новый поставщик"><SupplierForm /></Panel>
      </div>
    </>
  );
}
