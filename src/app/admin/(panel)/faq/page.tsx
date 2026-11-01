import { asc } from 'drizzle-orm';
import { SubmitButton } from '@/components/admin/submit-button';
import { Field, Flash, PageHeader, Panel, TextArea } from '@/components/admin/ui';
import { db } from '@/db/client';
import { faqItems } from '@/db/schema';
import { saveFaq } from '@/server/admin/actions/content';
import { requireUser } from '@/server/auth/session';

type Faq = typeof faqItems.$inferSelect;

function FaqForm({ item }: { item?: Faq }) {
  return (
    <form action={saveFaq} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="id" value={item?.id ?? ''} />
      <Field label="Вопрос (рус.)" name="qRu" required defaultValue={item?.qRu} />
      <Field label="Вопрос (каз.)" name="qKk" required defaultValue={item?.qKk} />
      <TextArea label="Ответ (рус.)" name="aRu" required defaultValue={item?.aRu} />
      <TextArea label="Ответ (каз.)" name="aKk" required defaultValue={item?.aKk} />
      <Field label="Порядок" name="sort" type="number" defaultValue={item?.sort ?? 0} />
      <div className="flex items-end gap-2">
        <SubmitButton variant={item ? 'outline' : 'primary'}>{item ? 'Сохранить' : 'Добавить'}</SubmitButton>
        {item && <SubmitButton variant="danger" name="intent" value="delete" confirm="Удалить вопрос?">Удалить</SubmitButton>}
      </div>
    </form>
  );
}

export default async function FaqAdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireUser('content');
  const flash = await searchParams;
  const items = await db.select().from(faqItems).orderBy(asc(faqItems.sort));
  return (
    <>
      <PageHeader title="FAQ" />
      <Flash {...flash} />
      <div className="space-y-4">
        {items.map((item) => <Panel key={item.id} title={item.qRu}><FaqForm item={item} /></Panel>)}
        <Panel title="Новый вопрос"><FaqForm /></Panel>
      </div>
    </>
  );
}
