import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

// В dev сохраняем пул между hot-reload, иначе Next.js создаёт много
// соединений. Для Neon держим пул маленьким: этого достаточно для игры
// на старте и безопаснее для бесплатного тарифа.
const globalForDb = globalThis as typeof globalThis & {
  __neonJumpPool?: Pool;
  __neonJumpDatabaseUrl?: string;
};

// Если DATABASE_URL изменился при разработке — закрываем старый пул,
// чтобы приложение не продолжало ходить в прежнюю базу.
if (
  globalForDb.__neonJumpPool &&
  globalForDb.__neonJumpDatabaseUrl !== databaseUrl
) {
  void globalForDb.__neonJumpPool.end();
  globalForDb.__neonJumpPool = undefined;
}

export const pool =
  globalForDb.__neonJumpPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 3,
    min: 0,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__neonJumpPool = pool;
  globalForDb.__neonJumpDatabaseUrl = databaseUrl;
}

export const db = drizzle(pool);
