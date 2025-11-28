import fs from "fs";
import path from "path";
import crypto from "crypto";
import tar from "tar";
import { getPool } from "./db.js";
import config from "./config.js";
import logger from "./logger.js";

const AUTH_DIR = path.join(process.cwd(), "auth");

function getKeyBuffer() {
  if (!config.authEncKey) throw new Error("AUTH_ENC_KEY not set");
  return Buffer.from(config.authEncKey, "base64");
}

function decryptBuffer(storedBuf) {
  const key = getKeyBuffer();
  const iv = storedBuf.slice(0, 12);
  const tag = storedBuf.slice(12, 28);
  const enc = storedBuf.slice(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]);
}

export async function restoreLatest(sessionId = "default", force = false) {
  const pool = getPool();
  if (!pool) {
    logger.warn("DB not configured; skipping restore");
    return false;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const lockRes = await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS got', [sessionId]);
    if (!lockRes.rows[0].got) {
      logger.warn("Restore: could not get lock, skipping");
      await client.query("ROLLBACK");
      return false;
    }

    if (!force && fs.existsSync(path.join(AUTH_DIR, "creds.json"))) {
      logger.info("Local auth exists, skipping restore");
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [sessionId]);
      await client.query("COMMIT");
      return true;
    }

    const res = await client.query(
      'SELECT id, data FROM session_backups WHERE session_id=$1 ORDER BY created_at DESC LIMIT 1',
      [sessionId]
    );
    if (!res.rows.length) {
      logger.info("No backup found to restore");
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [sessionId]);
      await client.query("COMMIT");
      return false;
    }

    const cipherBuf = res.rows[0].data;
    const tarBuf = decryptBuffer(cipherBuf);
    const tmp = path.join("/tmp", `restore-${Date.now()}.tgz`);
    fs.writeFileSync(tmp, tarBuf);

    const tmpDir = path.join("/tmp", `auth-restored-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    await tar.x({ file: tmp, cwd: tmpDir });

    if (!fs.existsSync(path.join(tmpDir, "creds.json"))) {
      throw new Error("Restored archive missing creds.json");
    }

    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
    fs.renameSync(tmpDir, AUTH_DIR);
    fs.unlinkSync(tmp);

    await client.query("SELECT pg_advisory_unlock(hashtext($1))", [sessionId]);
    await client.query("COMMIT");

    logger.info({ sessionId }, "Restore successful");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "Restore failed");
    throw err;
  } finally {
    client.release();
  }
}
