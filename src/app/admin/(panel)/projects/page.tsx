/* eslint-disable @next/next/no-img-element */
import { desc } from 'drizzle-orm';
import { SubmitButton } from '@/components/admin/submit-button';
import { Badge, Checkbox, Field, Flash, PageHeader, Panel, TextArea } from '@/components/admin/ui';
import { db } from '@/db/client';
import { projects } from '@/db/schema';
import { saveProject } from '@/server/admin/actions/content';
import { requireUser } from '@/server/auth/session';

type Project = typeof projects.$inferSelect;

function ProjectForm({ project }: { project?: Project }) {
  return (
    <form action={saveProject} className="grid gap-3 md:grid-cols-4">
      <input type="hidden" name="id" value={project?.id ?? ''} />
      <Field className="md:col-span-2" label="Название" name="title" required defaultValue={project?.title} />
      <Field label="Город" name="city" defaultValue={project?.city ?? ''} />
      <Field label="Тип работ" name="workType" defaultValue={project?.workType ?? ''} />
      <Field label="Объём поставки" name="volume" defaultValue={project?.volume ?? ''} />
      <TextArea className="md:col-span-3" label="Описание" name="description" defaultValue={project?.description ?? ''} />
      {project?.images.map((src) => <img key={src} src={src} alt="" className="h-24 w-full rounded object-cover" />)}
      <Field label="Добавить фото" name="image" type="file" accept=".jpg,.jpeg,.png,.webp" />
      <div className="space-y-2 md:col-span-2">
        <Checkbox label="Это иллюстрация (не реальный объект)" name="isIllustration" defaultChecked={project?.isIllustration ?? true} hint="Реальные объекты публикуйте только с подтверждением поставки" />
        <Checkbox label="Опубликовать" name="published" defaultChecked={project?.published} />
      </div>
      <div className="flex items-end gap-2">
        <SubmitButton variant={project ? 'outline' : 'primary'}>{project ? 'Сохранить' : 'Добавить'}</SubmitButton>
        {project && <SubmitButton variant="danger" name="intent" value="delete" confirm="Удалить проект?">Удалить</SubmitButton>}
      </div>
    </form>
  );
}

export default async function ProjectsAdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireUser('content');
  const flash = await searchParams;
  const list = await db.select().from(projects).orderBy(desc(projects.createdAt));
  return (
    <>
      <PageHeader title="Проекты" description="Реальные объекты показываются в «Наших проектах», иллюстрации — в «Примерах применения» с пометкой." />
      <Flash {...flash} />
      <div className="space-y-4">
        {list.map((p) => (
          <Panel key={p.id} title={p.title} actions={<div className="flex gap-1">{p.isIllustration ? <Badge tone="yellow">Иллюстрация</Badge> : <Badge tone="green">Реальный объект</Badge>}{p.published ? <Badge tone="green">Опубликован</Badge> : <Badge>Скрыт</Badge>}</div>}>
            <ProjectForm project={p} />
          </Panel>
        ))}
        <Panel title="Новый проект"><ProjectForm /></Panel>
      </div>
    </>
  );
}
