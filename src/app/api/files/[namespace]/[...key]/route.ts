import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { readStored } from '@/server/storage';

type Params = { params: Promise<{ namespace: string; key: string[] }> };

export async function GET(_request: Request, { params }: Params) {
  const { namespace, key } = await params;
  if (namespace !== 'public' && namespace !== 'private') return new NextResponse(null, { status: 404 });
  // Файлы клиентов (спецификации) доступны только сотрудникам.
  if (namespace === 'private' && !(await getCurrentUser())) return new NextResponse(null, { status: 401 });

  const file = await readStored(namespace, key.join('/'));
  if (!file) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      'Content-Type': file.contentType,
      'Cache-Control': namespace === 'public' ? 'public, max-age=31536000, immutable' : 'private, no-store',
      'Content-Disposition': namespace === 'private' ? 'attachment' : 'inline',
    },
  });
}
