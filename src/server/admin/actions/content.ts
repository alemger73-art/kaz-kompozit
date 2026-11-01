'use server';
/** Контент сайта: проекты, сертификаты, FAQ, SEO. */
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/db/client';
import { certificates, faqItems, projects, seoPages } from '@/db/schema';
import { audit } from '@/server/audit';
import { requireUser } from '@/server/auth/session';
import { saveUpload, UploadError, type UploadKind } from '@/server/storage';
import { checkbox, firstError, formObject, optInt, optStr, str } from '../form';

async function uploadOrFail(file: FormDataEntryValue | null, kind: UploadKind, back: string): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  try {
    return await saveUpload(file, 'public', kind);
  } catch (error) {
    if (error instanceof UploadError) redirect(`${back}?error=${encodeURIComponent(error.message)}`);
    throw error;
  }
}

function done(path: string): never {
  revalidatePath('/', 'layout');
  redirect(`${path}?ok=1`);
}

const projectSchema = z.object({
  title: str(200).min(1), city: optStr(120), workType: optStr(120), volume: optStr(120),
  description: optStr(3000), isIllustration: checkbox, published: checkbox,
});

export async function saveProject(form: FormData) {
  const user = await requireUser('content');
  const id = String(form.get('id') ?? '');
  if (form.get('intent') === 'delete' && id) {
    await db.delete(projects).where(eq(projects.id, id));
    await audit(user.id, 'delete', 'project', id);
    done('/admin/projects');
  }
  const parsed = projectSchema.safeParse(formObject(form));
  if (!parsed.success) redirect(`/admin/projects?error=${encodeURIComponent(firstError(parsed.error))}`);
  const existing = id ? await db.query.projects.findFirst({ where: eq(projects.id, id) }) : null;
  const image = await uploadOrFail(form.get('image'), 'image', '/admin/projects');
  const images = image ? [...(existing?.images ?? []), image] : existing?.images ?? [];
  const values = { ...parsed.data, images };
  if (existing) await db.update(projects).set(values).where(eq(projects.id, id));
  else await db.insert(projects).values(values);
  await audit(user.id, 'save', 'project', id || null, { title: values.title, isIllustration: values.isIllustration });
  done('/admin/projects');
}

const certificateSchema = z.object({
  title: str(200).min(1), issuer: optStr(200), productId: optStr(64), validUntil: optStr(20), published: checkbox,
});

export async function saveCertificate(form: FormData) {
  const user = await requireUser('content');
  const id = String(form.get('id') ?? '');
  if (form.get('intent') === 'delete' && id) {
    await db.delete(certificates).where(eq(certificates.id, id));
    await audit(user.id, 'delete', 'certificate', id);
    done('/admin/certificates');
  }
  const parsed = certificateSchema.safeParse(formObject(form));
  if (!parsed.success) redirect(`/admin/certificates?error=${encodeURIComponent(firstError(parsed.error))}`);
  const fileUrl = await uploadOrFail(form.get('file'), 'document', '/admin/certificates');
  const values = { ...parsed.data, validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null };
  if (id) {
    await db.update(certificates).set(fileUrl ? { ...values, fileUrl } : values).where(eq(certificates.id, id));
  } else {
    if (!fileUrl) redirect('/admin/certificates?error=Загрузите файл сертификата (PDF)');
    await db.insert(certificates).values({ ...values, fileUrl });
  }
  await audit(user.id, 'save', 'certificate', id || null, { title: values.title });
  done('/admin/certificates');
}

const faqSchema = z.object({ qRu: str(500).min(1), aRu: str(3000).min(1), qKk: str(500).min(1), aKk: str(3000).min(1), sort: optInt });

export async function saveFaq(form: FormData) {
  const user = await requireUser('content');
  const id = String(form.get('id') ?? '');
  if (form.get('intent') === 'delete' && id) {
    await db.delete(faqItems).where(eq(faqItems.id, id));
    await audit(user.id, 'delete', 'faq', id);
    done('/admin/faq');
  }
  const parsed = faqSchema.safeParse(formObject(form));
  if (!parsed.success) redirect(`/admin/faq?error=${encodeURIComponent(firstError(parsed.error))}`);
  const values = { ...parsed.data, sort: parsed.data.sort ?? 0 };
  if (id) await db.update(faqItems).set(values).where(eq(faqItems.id, id));
  else await db.insert(faqItems).values(values);
  await audit(user.id, 'save', 'faq', id || null);
  done('/admin/faq');
}

const seoSchema = z.object({
  path: str(200).regex(/^\/[a-z0-9/-]*$/, 'путь вида /catalog'),
  titleRu: optStr(200), descRu: optStr(400), titleKk: optStr(200), descKk: optStr(400),
});

export async function saveSeo(form: FormData) {
  const user = await requireUser('seo');
  const parsed = seoSchema.safeParse(formObject(form));
  if (!parsed.success) redirect(`/admin/seo?error=${encodeURIComponent(firstError(parsed.error))}`);
  const { path, ...values } = parsed.data;
  await db.insert(seoPages).values({ path, ...values }).onConflictDoUpdate({ target: seoPages.path, set: values });
  await audit(user.id, 'save', 'seo', path);
  done('/admin/seo');
}
