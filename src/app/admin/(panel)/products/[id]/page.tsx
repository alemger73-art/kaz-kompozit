/* eslint-disable @next/next/no-img-element */
import { asc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/admin/submit-button';
import { Checkbox, Field, Flash, PageHeader, Panel, Select, TextArea } from '@/components/admin/ui';
import { db } from '@/db/client';
import { categories, products } from '@/db/schema';
import { saveProduct } from '@/server/admin/actions/products';
import { can, requireUser } from '@/server/auth/session';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function ProductEditPage({ params, searchParams }: Props) {
  const user = await requireUser('products');
  const { id } = await params;
  const flash = await searchParams;
  const isNew = id === 'new';
  const product = isNew ? null : await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!isNew && !product) notFound();
  const cats = await db.select().from(categories).orderBy(asc(categories.sort));
  const readOnly = !can(user, 'productsEdit');
  const specsText = (product?.specs ?? []).map((s) => `${s.labelRu} | ${s.labelKk} | ${s.value} | ${s.verified ? 'да' : 'нет'}`).join('\n');

  return (
    <>
      <PageHeader title={isNew ? 'Новый товар' : product!.nameRu} description={readOnly ? 'Только просмотр' : undefined} />
      <Flash {...flash} />
      <form action={saveProduct} className="space-y-6">
        <input type="hidden" name="id" value={product?.id ?? ''} />
        <fieldset disabled={readOnly} className="space-y-6">
          <Panel title="Основное">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Название (рус.)" name="nameRu" required defaultValue={product?.nameRu} />
              <Field label="Название (каз.)" name="nameKk" required defaultValue={product?.nameKk} />
              <Field label="Адрес страницы (slug)" name="slug" required pattern="[a-z0-9-]+" defaultValue={product?.slug} hint="например: armatura-14-mm" />
              <Select label="Категория" name="categoryId" defaultValue={product?.categoryId} options={cats.map((c) => ({ value: c.id, label: c.nameRu }))} />
              <Field label="Диаметр, мм" name="diameterMm" inputMode="decimal" defaultValue={product?.diameterMm ?? ''} hint="пусто — для сопутствующих товаров" />
              <Field label="Порядок сортировки" name="sort" type="number" min={0} defaultValue={product?.sort ?? 0} />
              <TextArea label="Описание (рус.)" name="descriptionRu" rows={4} defaultValue={product?.descriptionRu ?? ''} />
              <TextArea label="Описание (каз.)" name="descriptionKk" rows={4} defaultValue={product?.descriptionKk ?? ''} />
              <Checkbox label="Показывать на сайте" name="published" defaultChecked={product?.published ?? true} />
            </div>
          </Panel>

          <Panel title="Характеристики и поставка">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Масса 1 м, кг" name="massPerMeterKg" inputMode="decimal" defaultValue={product?.massPerMeterKg ?? ''} />
              <div className="md:col-span-2 md:pt-6"><Checkbox label="Масса подтверждена поставщиком" name="massVerified" defaultChecked={product?.massVerified} hint="Только подтверждённая масса используется в калькуляторе" /></div>
              <div className="space-y-2">
                <span className="field-label">Формат поставки</span>
                <Checkbox label="Бухта" name="formatCoil" defaultChecked={product?.supplyFormats.includes('COIL') ?? true} />
                <Checkbox label="Пруток" name="formatBar" defaultChecked={product?.supplyFormats.includes('BAR')} />
              </div>
              <Field label="Длина бухты, м" name="coilLengthM" type="number" min={0} defaultValue={product?.coilLengthM ?? ''} />
              <Field label="Длина прутка, м" name="barLengthM" inputMode="decimal" defaultValue={product?.barLengthM ?? ''} />
              <Field label="Минимальный заказ, м" name="minOrderM" type="number" min={0} defaultValue={product?.minOrderM ?? ''} />
              <Select label="Наличие" name="availability" defaultValue={product?.availability ?? 'ON_ORDER'} options={[
                { value: 'IN_STOCK', label: 'В наличии' }, { value: 'ON_ORDER', label: 'Под заказ' }, { value: 'OUT_OF_STOCK', label: 'Нет в наличии' },
              ]} />
              <Field label="Остаток, м" name="stockM" type="number" min={0} defaultValue={product?.stockM ?? ''} hint="Внутренний учёт, на сайте не показывается" />
              <Field label="Срок поставки (рус.)" name="leadTimeRu" defaultValue={product?.leadTimeRu ?? ''} />
              <Field label="Срок поставки (каз.)" name="leadTimeKk" defaultValue={product?.leadTimeKk ?? ''} />
              <TextArea className="md:col-span-3" label="Технические характеристики" name="specsText" rows={6} defaultValue={specsText}
                hint="Каждая строка: Название (рус.) | Название (каз.) | Значение | да/нет (подтверждено). Неподтверждённые помечаются на сайте." />
              <TextArea label="Сфера применения (рус.)" name="applicationsRu" defaultValue={product?.applicationsRu ?? ''} />
              <TextArea label="Сфера применения (каз.)" name="applicationsKk" defaultValue={product?.applicationsKk ?? ''} />
            </div>
          </Panel>

          <Panel title="Фотографии">
            {product && product.images.length > 0 && (
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {product.images.map((src) => (
                  <label key={src} className="space-y-1 text-xs">
                    <img src={src} alt="" className="aspect-square w-full rounded-lg object-cover" />
                    <span className="flex items-center gap-1.5"><input type="checkbox" name="removeImage" value={src} /> удалить</span>
                  </label>
                ))}
              </div>
            )}
            <Field label="Добавить фото (JPG, PNG, WebP, до 10 МБ)" name="images" type="file" accept=".jpg,.jpeg,.png,.webp,.avif" multiple />
          </Panel>

          <Panel title="SEO">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Title" name="seoTitle" maxLength={200} defaultValue={product?.seoTitle ?? ''} />
              <Field label="Description" name="seoDescription" maxLength={400} defaultValue={product?.seoDescription ?? ''} />
            </div>
          </Panel>
          {!readOnly && <SubmitButton>Сохранить товар</SubmitButton>}
        </fieldset>
      </form>
    </>
  );
}
