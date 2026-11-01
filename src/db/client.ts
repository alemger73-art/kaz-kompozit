import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

type Db = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { db?: Db; pool?: Pool };

function createDb(): Db {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
  globalForDb.pool = pool;
  return drizzle(pool, { schema });
}

/** Единое подключение к БД (переиспользуется при горячей перезагрузке). */
export const db: Db = globalForDb.db ?? createDb();
if (process.env.NODE_ENV !== 'production') globalForDb.db = db;

export { schema };
