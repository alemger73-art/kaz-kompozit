import Link from 'next/link';
import { eq, count } from 'drizzle-orm';
import { AdminNav, type NavGroup } from '@/components/admin/nav';
import { db } from '@/db/client';
import { deals } from '@/db/schema';
import { isTestMode } from '@/lib/config';
import { logoutAction } from '@/server/admin/actions/auth';
import { can, requireUser, type Permission } from '@/server/auth/session';

const ROLE_LABELS = { ADMIN: 'Администратор', MANAGER: 'Менеджер', CONTENT: 'Контент-менеджер' } as const;

type Item = { href: string; label: string; permission: Permission; badge?: number };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [{ value: newDeals }] = await db.select({ value: count() }).from(deals).where(eq(deals.status, 'NEW'));

  const groups: Array<{ title: string; items: Item[] }> = [
    { title: 'Обзор', items: [{ href: '/admin', label: 'Главная панель', permission: 'dashboard' }] },
    {
      title: 'Продажи',
      items: [
        { href: '/admin/leads', label: 'Заявки', permission: 'crm' },
        { href: '/admin/deals', label: 'Сделки (CRM)', permission: 'crm', badge: newDeals },
        { href: '/admin/customers', label: 'Клиенты', permission: 'crm' },
        { href: '/admin/quotes', label: 'Коммерческие предложения', permission: 'crm' },
      ],
    },
    {
      title: 'Каталог и цены',
      items: [
        { href: '/admin/products', label: 'Товары', permission: 'products' },
        { href: '/admin/prices/purchase', label: 'Закупочные цены', permission: 'purchasePricesView' },
        { href: '/admin/prices/retail', label: 'Розничные цены', permission: 'purchasePricesView' },
        { href: '/admin/prices/wholesale', label: 'Оптовые цены', permission: 'purchasePricesView' },
        { href: '/admin/discounts', label: 'Скидки и промокоды', permission: 'discounts' },
        { href: '/admin/suppliers', label: 'Поставщики', permission: 'suppliers' },
        { href: '/admin/logistics', label: 'Логистика', permission: 'logistics' },
      ],
    },
    {
      title: 'Контент',
      items: [
        { href: '/admin/projects', label: 'Проекты', permission: 'content' },
        { href: '/admin/certificates', label: 'Сертификаты', permission: 'content' },
        { href: '/admin/faq', label: 'FAQ', permission: 'content' },
        { href: '/admin/seo', label: 'SEO', permission: 'seo' },
      ],
    },
    {
      title: 'Аналитика и интеграции',
      items: [
        { href: '/admin/stats', label: 'Статистика и экспорт', permission: 'stats' },
        { href: '/admin/whatsapp', label: 'WhatsApp', permission: 'integrations' },
        { href: '/admin/agents', label: 'ИИ-агенты', permission: 'integrations' },
      ],
    },
    {
      title: 'Система',
      items: [
        { href: '/admin/settings', label: 'Настройки компании', permission: 'settings' },
        { href: '/admin/users', label: 'Пользователи и роли', permission: 'users' },
        { href: '/admin/audit', label: 'Журнал действий', permission: 'audit' },
      ],
    },
  ];

  const visible: NavGroup[] = groups
    .map((g) => ({ title: g.title, items: g.items.filter((i) => can(user, i.permission)).map(({ href, label, badge }) => ({ href, label, badge })) }))
    .filter((g) => g.items.length > 0);

  const sidebar = (
    <>
      <AdminNav groups={visible} />
      <div className="mt-8 border-t border-white/10 pt-4 text-xs text-white/50">
        <div className="font-bold text-white">{user.name}</div>
        <div>{ROLE_LABELS[user.role]}</div>
        <form action={logoutAction} className="mt-3">
          <button type="submit" className="text-accent-400 hover:underline">Выйти</button>
        </form>
      </div>
    </>
  );

  return (
    <div className="lg:flex">
      <aside className="hidden w-64 shrink-0 bg-graphite-950 lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto p-4">
          <Link href="/admin" className="mb-6 flex items-center gap-2 px-3 pt-2 font-display text-sm font-bold uppercase text-white">
            <span className="grid h-8 w-8 place-items-center rounded bg-accent-500">K</span>Админка
          </Link>
          {sidebar}
        </div>
      </aside>
      <details className="group bg-graphite-950 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-display text-sm font-bold uppercase text-white">
          Админка <span className="text-xs font-normal normal-case text-white/60 group-open:hidden">Меню ▾</span>
        </summary>
        <div className="max-h-[75vh] overflow-y-auto p-4">{sidebar}</div>
      </details>
      <div className="min-w-0 flex-1">
        {isTestMode && (
          <div className="bg-fiber-300/40 px-4 py-1.5 text-center text-xs font-semibold text-graphite-800">
            Тестовый режим: на сайте показываются демо-цены с пометкой. Для боевого режима задайте APP_MODE=production.
          </div>
        )}
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
        <div className="px-8 pb-6 text-xs text-graphite-400">
          <Link href="/ru" target="_blank" className="hover:text-accent-600">Открыть сайт ↗</Link>
        </div>
      </div>
    </div>
  );
}
