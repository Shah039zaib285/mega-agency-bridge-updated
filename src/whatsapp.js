// Minimal, reliable Baileys integration + forward to n8n + send API
import baileys from "@whiskeysockets/baileys";
import qrcodeTerminal from "qrcode-terminal";
import fs from "fs";
import fetch from "node-fetch";
import config from "./config.js";
import logger from "./logger.js";

const { default: makeWASocket, useMultiFileAuthState } = baileys;

let sock = null;
let status = { connected: false, lastDisconnect: null };

export function getStatus() {
  return status;
}

export async function startWhatsApp() {
  try {
    const authFolder = "./auth";
    if (!fs.existsSync(authFolder)) fs.mkdirSync(authFolder);

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      // browser: Browsers.macOS("Safari") // optional
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (u) => {
      const { connection, lastDisconnect, qr } = u;
      if (qr) {
        logger.info("QR RECEIVED");
        qrcodeTerminal.generate(qr, { small: true });
      }
      if (connection === "open") {
        status = { connected: true, lastDisconnect: null };
        logger.info("WhatsApp connected");
      } else if (connection === "close") {
        status = { connected: false, lastDisconnect };
        logger.warn("WhatsApp disconnected", lastDisconnect || {});
        // attempt reconnect handled externally by process restart or you can call startWhatsApp() with backoff
      }
    });

    sock.ev.on("messages.upsert", async (m) => {
      try {
        const msgs = m.messages || [];
        for (const msg of msgs) {
          if (!msg.message || msg.key?.fromMe) continue;
          const from = msg.key.remoteJid;
          const body = msg.message.conversation ||
            msg.message?.extendedTextMessage?.text ||
            null;

          logger.info({ from, body }, "Incoming message");

          // forward to n8n if configured
          if (config.n8nWebhook) {
            fetch(config.n8nWebhook, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ from, body, timestamp: Date.now() })
            }).catch((e) => logger.warn("Forward to n8n failed", e?.message));
          }
        }
      } catch (e) {
        logger.error(e, "messages.upsert handler error");
      }
    });

    return sock;
  } catch (err) {
    logger.error(err, "startWhatsApp error");
    throw err;
  }
}

export async function sendTextMessage(jid, text) {
  if (!sock) throw new Error("WhatsApp socket not ready");
  return sock.sendMessage(jid, { text });
}

// auto start at import is optional; we will call from server if needed
startWhatsApp().catch((e) => logger.error(e, "startup error"));
