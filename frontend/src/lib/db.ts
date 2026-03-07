import { Pool } from "pg";

// Trim any accidental whitespace/newlines from env var
const connectionString = (process.env.DATABASE_URL || "").trim();

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 5000,
    });
    pool.on("error", (err) => {
      console.error("pg pool error:", err.message);
      pool = null; // reset so next call re-initializes
    });
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const res = await client.query(sql, params);
    return res.rows as T[];
  } finally {
    client.release();
  }
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
