import fs from "fs";
import path from "path";
import crypto from "crypto";
import tar from "tar";
import { getPool } from "../db.js";
import config from "../config.js";
import logger from "../logger.js";

const AUTH_DIR = path.join(process.cwd(), "auth");

function getKeyBuffer() {
  if (!config.authEncKey) throw new Error("AUTH_ENC_KEY not set");
  return Buffer.from(config.authEncKey, "base64");
}

async function createAuthTarBuffer() {
  if (!fs.existsSync(AUTH_DIR)) throw new Error("Auth directory does not exist, nothing to backup");
  const tmp = path.join("/tmp", `auth-${Date.now()}.tgz`);
  await tar.c({ gzip: true, file: tmp, cwd: AUTH_DIR }, ["." ]);
  const buf = fs.readFileSync(tmp);
  fs.unlinkSync(tmp);
  return buf;
}

function encryptBuffer(buf) {
  const key = getKeyBuffer();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(buf), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]);
}

export async function saveBackupToDb(sessionId = "default") {
  const pool = getPool();
  if (!pool) {
    logger.warn("DB not configured; skipping backup");
    return;
  }

  try {
    const tarBuf = await createAuthTarBuffer();
    const cipherBuf = encryptBuffer(tarBuf);
    const checksum = crypto.createHash("sha256").update(cipherBuf).digest("hex");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO sessions (session_id) VALUES ($1) ON CONFLICT DO NOTHING", [sessionId]);
      const lockRes = await client.query("SELECT pg_try_advisory_lock(hashtext($1)) AS got", [sessionId]);
      if (!lockRes.rows[0].got) {
        logger.warn("Could not obtain advisory lock for backup; another op running");
        await client.query("ROLLBACK");
        return;
      }

      await client.query("INSERT INTO session_backups(session_id, data, size_bytes, checksum) VALUES($1,$2,$3,$4)",
        [sessionId, cipherBuf, cipherBuf.length, checksum]
      );
      await client.query("UPDATE sessions SET last_backup_at = now() WHERE session_id = $1", [sessionId]);

      await client.query(`DELETE FROM session_backups
         WHERE id IN (
           SELECT id FROM session_backups
           WHERE session_id = $1
           ORDER BY created_at DESC
           OFFSET 5
         )`, [sessionId]);

      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [sessionId]);
      await client.query("COMMIT");
      logger.info({ sessionId, size: cipherBuf.length }, "Auth backup saved to DB");
    } catch (err) {
      await client.query("ROLLBACK");
      logger.error({ err }, "Failed to save backup to DB");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ err }, "Error during backup");
    throw err;
  }
}
