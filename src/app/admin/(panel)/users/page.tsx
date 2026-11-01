import { asc } from 'drizzle-orm';
import { SubmitButton } from '@/components/admin/submit-button';
import { Checkbox, Field, Flash, PageHeader, Panel, Select } from '@/components/admin/ui';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { saveUser } from '@/server/admin/actions/system';
import { requireUser } from '@/server/auth/session';

const ROLES = [
  { value: 'ADMIN', label: 'Администратор — всё, включая закупочные цены и пользователей' },
  { value: 'MANAGER', label: 'Менеджер — заявки, CRM, КП, логистика, просмотр цен' },
  { value: 'CONTENT', label: 'Контент — товары, проекты, сертификаты, SEO' },
];

type User = Pick<typeof users.$inferSelect, 'id' | 'name' | 'email' | 'role' | 'active'>;

function UserForm({ user }: { user?: User }) {
  return (
    <form action={saveUser} className="grid gap-3 md:grid-cols-4">
      <input type="hidden" name="id" value={user?.id ?? ''} />
      <Field label="Имя" name="name" required defaultValue={user?.name} />
      <Field label="E-mail (логин)" name="email" type="email" required defaultValue={user?.email} />
      <Select label="Роль" name="role" defaultValue={user?.role ?? 'MANAGER'} options={ROLES} />
      <Field label={user ? 'Новый пароль (необязательно)' : 'Пароль'} name="password" type="password" minLength={10} autoComplete="new-password" required={!user} />
      <Checkbox label="Активен" name="active" defaultChecked={user?.active ?? true} />
      <div><SubmitButton variant={user ? 'outline' : 'primary'}>{user ? 'Сохранить' : 'Создать пользователя'}</SubmitButton></div>
    </form>
  );
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireUser('users');
  const flash = await searchParams;
  const list = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, active: users.active }).from(users).orderBy(asc(users.createdAt));
  return (
    <>
      <PageHeader title="Пользователи и роли" />
      <Flash {...flash} />
      <div className="space-y-4">
        {list.map((u) => <Panel key={u.id} title={`${u.name} · ${u.email}`}><UserForm user={u} /></Panel>)}
        <Panel title="Новый пользователь"><UserForm /></Panel>
      </div>
    </>
  );
}
