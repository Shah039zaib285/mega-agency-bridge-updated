import qrcodeTerminal from "qrcode-terminal";
import * as baileys from "@whiskeysockets/baileys";

import logger from "./logger.js";
import config from "./config.js";
import { restoreLatest } from "./restore.js";
import { saveBackupToDb } from "./middleware/backup.js";
import { setLatestQr } from "./routes/adminQr.js";

const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers
} = baileys;

let sock = null;
let ioRef = null;

const SESSION_ID = "default";

export function attachIo(io) {
  ioRef = io;
}

export function getStatus() {
  return {
    connected: !!(sock && sock.user),
    lastDisconnect: null,
    error: null
  };
}

export async function startWhatsApp() {
  try {
    if (config.dbUrl && config.authEncKey) {
      await restoreLatest(SESSION_ID, false);
    } else {
      logger.info("DB or AUTH_ENC_KEY not set - skipping auto-restore");
    }
  } catch (err) {
    logger.error({ err }, "Auto-restore failed, continuing without restored auth");
  }

  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.macOS("Safari")
  });

  sock.ev.on("creds.update", async () => {
    try {
      await saveCreds();
      if (config.dbUrl && config.authEncKey) {
        await saveBackupToDb(SESSION_ID);
      }
    } catch (err) {
      logger.error({ err }, "Error during creds.update backup");
    }
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info("QR RECEIVED - scan this from WhatsApp");
      qrcodeTerminal.generate(qr, { small: true });
      setLatestQr(qr);
      if (ioRef) ioRef.emit("whatsapp:qr", { qr });
    }

    if (connection === "open") {
      logger.info("WhatsApp connection opened");
      if (ioRef) ioRef.emit("whatsapp:connected");
      setLatestQr(null);
    } else if (connection === "close") {
      logger.warn({ lastDisconnect }, "WhatsApp connection closed");
      if (ioRef) ioRef.emit("whatsapp:disconnected", { lastDisconnect });

      const reason = lastDisconnect?.error?.output?.statusCode || DisconnectReason.connectionClosed;

      if (reason !== DisconnectReason.loggedOut) {
        logger.warn("Reconnecting...");
        startWhatsApp();
      } else {
        logger.error("Logged out — delete auth folder to re-login");
      }
    }
  });

  sock.ev.on("messages.upsert", async (m) => {
    const upsertType = m.type;
    const msgs = m.messages || [];
    for (const msg of msgs) {
      const from = msg.key.remoteJid;
      const body =
        (msg.message && msg.message.conversation) ||
        (msg.message &&
          msg.message.extendedTextMessage &&
          msg.message.extendedTextMessage.text) ||
        null;

      logger.info({ from, body, upsertType }, "Incoming message");

      if (ioRef) {
        ioRef.emit("whatsapp:message", { from, body, upsertType });
      }
    }
  });

  return sock;
}

export async function sendTextMessage(jid, text) {
  if (!sock) {
    throw new Error("WhatsApp socket not ready");
  }
  const result = await sock.sendMessage(jid, { text });
  return result;
}
