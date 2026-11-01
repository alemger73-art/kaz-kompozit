import { asc } from 'drizzle-orm';
import { SubmitButton } from '@/components/admin/submit-button';
import { Checkbox, Field, Flash, PageHeader, Panel, Select } from '@/components/admin/ui';
import { db } from '@/db/client';
import { certificates, products } from '@/db/schema';
import { saveCertificate } from '@/server/admin/actions/content';
import { requireUser } from '@/server/auth/session';

type Certificate = typeof certificates.$inferSelect;

export default async function CertificatesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireUser('content');
  const flash = await searchParams;
  const [list, productList] = await Promise.all([
    db.select().from(certificates),
    db.select({ id: products.id, nameRu: products.nameRu }).from(products).orderBy(asc(products.sort)),
  ]);
  const productOptions = [{ value: '', label: 'Для всех товаров' }, ...productList.map((p) => ({ value: p.id, label: p.nameRu }))];

  const form = (c?: Certificate) => (
    <form action={saveCertificate} className="grid gap-3 md:grid-cols-3">
      <input type="hidden" name="id" value={c?.id ?? ''} />
      <Field label="Название документа" name="title" required defaultValue={c?.title} />
      <Field label="Кем выдан" name="issuer" defaultValue={c?.issuer ?? ''} />
      <Select label="Товар" name="productId" defaultValue={c?.productId ?? ''} options={productOptions} />
      <Field label="Действует до" name="validUntil" type="date" defaultValue={c?.validUntil?.toISOString().slice(0, 10) ?? ''} />
      <Field label={c ? 'Заменить файл (PDF)' : 'Файл (PDF)'} name="file" type="file" accept=".pdf" required={!c} />
      <div className="space-y-2 md:pt-6">
        <Checkbox label="Показывать на сайте" name="published" defaultChecked={c?.published} />
        {c && <a href={c.fileUrl} target="_blank" className="block text-xs font-bold text-accent-600" rel="noreferrer">Открыть файл</a>}
      </div>
      <div className="flex gap-2">
        <SubmitButton variant={c ? 'outline' : 'primary'}>{c ? 'Сохранить' : 'Загрузить'}</SubmitButton>
        {c && <SubmitButton variant="danger" name="intent" value="delete" confirm="Удалить документ?">Удалить</SubmitButton>}
      </div>
    </form>
  );

  return (
    <>
      <PageHeader title="Сертификаты и документы качества" description="Загружайте только подлинные документы поставщика." />
      <Flash {...flash} />
      <div className="space-y-4">
        {list.map((c) => <Panel key={c.id} title={c.title}>{form(c)}</Panel>)}
        <Panel title="Новый документ">{form()}</Panel>
      </div>
    </>
  );
}
