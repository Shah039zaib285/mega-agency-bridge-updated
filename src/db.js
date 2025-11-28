import { Pool } from "pg";
import logger from "./logger.js";
import config from "./config.js";

let pool = null;

if (config.dbUrl) {
  pool = new Pool({ connectionString: config.dbUrl });
  pool.on("error", (err) => logger.error({ err }, "Postgres pool error"));
} else {
  logger.info("No DATABASE_URL configured — DB features disabled");
}

export function getPool() {
  return pool;
}

export async function runMigrations() {
  if (!pool) {
    logger.info("Skipping migrations, no DB configured");
    return;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        last_backup_at TIMESTAMPTZ,
        connected BOOLEAN DEFAULT false,
        last_disconnect JSONB DEFAULT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS session_backups (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        data BYTEA NOT NULL,
        size_bytes INTEGER NOT NULL,
        checksum TEXT,
        notes TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS qr_tokens (
        id SERIAL PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        session_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT false
      );
    `);

    await client.query("COMMIT");
    logger.info("DB migrations complete");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "DB migrations failed");
    throw err;
  } finally {
    client.release();
  }
}
