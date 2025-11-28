import express from "express";
import http from "http";
import cors from "cors";
import { Server as IOServer } from "socket.io";

import config from "./config.js";
import logger from "./logger.js";

import adminQrRouter from "./routes/adminQr.js";
import authRouter from "./routes/auth.js";
import messagesRouter from "./routes/messages.js";
import statusRouter from "./routes/status.js";

import { setupSockets } from "./sockets/index.js";
import { startWhatsApp, attachIo } from "./whatsapp.js";
import { runMigrations } from "./db.js";
import { errorHandler } from "./middleware/errorHandler.js";

const PORT = config.port || 3000;
const app = express();

app.use(cors());
app.use(express.json());

app.use("/admin", adminQrRouter);
app.use("/auth", authRouter);
app.use("/messages", messagesRouter);
app.use("/status", statusRouter);

app.get("/", (req, res) => {
  res.send("🚀 WhatsApp Bridge Server Running...");
});

// error handling middleware (last)
app.use(errorHandler);

const server = http.createServer(app);
const io = new IOServer(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

setupSockets(io);
attachIo(io);

(async () => {
  try {
    if (config.dbUrl) {
      await runMigrations();
    } else {
      logger.info("No DATABASE_URL — skipping DB migrations");
    }

    await startWhatsApp();

    server.listen(PORT, () => {
      logger.info(`🚀 Server Running on PORT ${PORT}`);
    });
  } catch (err) {
    logger.error({ err }, "Failed to start application");
    process.exit(1);
  }
})();
