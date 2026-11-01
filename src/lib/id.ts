import { randomBytes } from 'node:crypto';

/** Короткий уникальный идентификатор для первичных ключей. */
export function createId(): string {
  return randomBytes(12).toString('base64url');
}
