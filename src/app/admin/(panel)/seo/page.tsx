import { SubmitButton } from '@/components/admin/submit-button';
import { Field, Flash, PageHeader, Panel } from '@/components/admin/ui';
import { db } from '@/db/client';
import { seoPages } from '@/db/schema';
import { ru } from '@/lib/i18n/ru';
import { saveSeo } from '@/server/admin/actions/content';
import { requireUser } from '@/server/auth/session';

const PAGES = [
  { path: '/', label: 'Главная', title: ru.seo.homeTitle, desc: ru.seo.homeDesc },
  { path: '/catalog', label: 'Каталог', title: ru.seo.catalogTitle, desc: ru.seo.catalogDesc },
  { path: '/calculator', label: 'Калькулятор', title: ru.seo.calcTitle, desc: ru.seo.calcDesc },
  { path: '/applications', label: 'Применение', title: ru.seo.applicationsTitle, desc: ru.seo.applicationsDesc },
  { path: '/delivery', label: 'Доставка', title: ru.seo.deliveryTitle, desc: ru.seo.deliveryDesc },
  { path: '/wholesale', label: 'Оптовикам', title: ru.seo.wholesaleTitle, desc: ru.seo.wholesaleDesc },
  { path: '/projects', label: 'Проекты', title: ru.seo.projectsTitle, desc: ru.seo.projectsDesc },
  { path: '/about', label: 'О компании', title: ru.seo.aboutTitle, desc: ru.seo.aboutDesc },
  { path: '/contacts', label: 'Контакты', title: ru.seo.contactsTitle, desc: ru.seo.contactsDesc },
];

export default async function SeoPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireUser('seo');
  const flash = await searchParams;
  const overrides = await db.select().from(seoPages);
  return (
    <>
      <PageHeader title="SEO" description="Пустые поля — используются тексты по умолчанию (показаны серым). Карточки товаров настраиваются в разделе «Товары». Sitemap и robots.txt формируются автоматически." />
      <Flash {...flash} />
      <div className="space-y-4">
        {PAGES.map((page) => {
          const o = overrides.find((x) => x.path === page.path);
          return (
            <Panel key={page.path} title={`${page.label} · ${page.path}`}>
              <form action={saveSeo} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="path" value={page.path} />
                <Field label="Title (рус.)" name="titleRu" maxLength={200} defaultValue={o?.titleRu ?? ''} placeholder={page.title} />
                <Field label="Title (каз.)" name="titleKk" maxLength={200} defaultValue={o?.titleKk ?? ''} />
                <Field label="Description (рус.)" name="descRu" maxLength={400} defaultValue={o?.descRu ?? ''} placeholder={page.desc} />
                <Field label="Description (каз.)" name="descKk" maxLength={400} defaultValue={o?.descKk ?? ''} />
                <div><SubmitButton variant="outline">Сохранить</SubmitButton></div>
              </form>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
