/**
 * Хранилище файлов: S3-совместимое (если заданы S3_* переменные) или локальная папка.
 * Файлы отдаются через /api/files/<namespace>/<key>; private — только авторизованным.
 */
import 'server-only';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createId } from '@/lib/id';

export type Namespace = 'public' | 'private';

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED = {
  image: { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif' },
  document: {
    '.pdf': 'application/pdf',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
  },
} as const;

export type UploadKind = keyof typeof ALLOWED;

const s3Config = {
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? 'auto',
  bucket: process.env.S3_BUCKET,
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
};

export const storageMode: 's3' | 'local' =
  s3Config.bucket && s3Config.accessKeyId && s3Config.secretAccessKey ? 's3' : 'local';

let client: S3Client | null = null;
function s3(): S3Client {
  client ??= new S3Client({
    endpoint: s3Config.endpoint,
    region: s3Config.region,
    forcePathStyle: true,
    credentials: { accessKeyId: s3Config.accessKeyId!, secretAccessKey: s3Config.secretAccessKey! },
  });
  return client;
}

const localRoot = path.resolve(process.env.STORAGE_DIR ?? './storage');

export class UploadError extends Error {}

/** Проверяет тип и размер файла, сохраняет и возвращает URL для отдачи. */
export async function saveUpload(file: File, namespace: Namespace, kind: UploadKind): Promise<string> {
  if (file.size === 0) throw new UploadError('Пустой файл');
  if (file.size > MAX_BYTES) throw new UploadError('Файл больше 10 МБ');
  const ext = path.extname(file.name).toLowerCase();
  const contentType = (ALLOWED[kind] as Record<string, string>)[ext];
  if (!contentType) throw new UploadError(`Недопустимый тип файла: ${ext || 'без расширения'}`);

  const key = `${new Date().toISOString().slice(0, 7)}/${createId()}${ext}`;
  const body = Buffer.from(await file.arrayBuffer());

  if (storageMode === 's3') {
    await s3().send(new PutObjectCommand({ Bucket: s3Config.bucket, Key: `${namespace}/${key}`, Body: body, ContentType: contentType }));
  } else {
    const target = path.join(localRoot, namespace, key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
  }
  return `/api/files/${namespace}/${key}`;
}

export async function readStored(namespace: Namespace, key: string): Promise<{ body: Buffer; contentType: string } | null> {
  // Защита от выхода за пределы хранилища.
  if (!/^[\w-]+\/[\w-]+\.[a-z0-9]+$/i.test(key)) return null;
  const ext = path.extname(key).toLowerCase();
  const contentType = { ...ALLOWED.image, ...ALLOWED.document }[ext as '.pdf'] ?? 'application/octet-stream';
  try {
    if (storageMode === 's3') {
      const result = await s3().send(new GetObjectCommand({ Bucket: s3Config.bucket, Key: `${namespace}/${key}` }));
      const bytes = await result.Body?.transformToByteArray();
      return bytes ? { body: Buffer.from(bytes), contentType } : null;
    }
    return { body: await readFile(path.join(localRoot, namespace, key)), contentType };
  } catch {
    return null;
  }
}
