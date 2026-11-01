/** Применяет миграции из папки drizzle/ (запускается при старте на Railway). */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
  await pool.end();
  console.log('Миграции применены');
}

main().catch((error) => {
  console.error('Ошибка миграции:', error);
  process.exit(1);
});
