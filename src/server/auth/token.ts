/** Подписанный токен сессии (JWT, HS256). Работает и в middleware (edge), и на сервере. */
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'kk_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = { sub: string; role: 'ADMIN' | 'MANAGER' | 'CONTENT'; name: string };

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET должен быть задан и содержать не менее 32 символов');
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    if (!payload.sub) return null;
    return { sub: payload.sub, role: payload.role as SessionPayload['role'], name: String(payload.name ?? '') };
  } catch {
    return null;
  }
}
