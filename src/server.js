import express from "express";
import statusRouter from "./routes/status.js";
import adminQrRouter from "./routes/adminQr.js";
import authRouter from "./routes/auth.js";
import messagesRouter from "./routes/messages.js";
import config from "./config.js";
import logger from "./logger.js";

// startup
const app = express();
app.use(express.json());

// routes
app.use("/status", statusRouter);
app.use("/admin", adminQrRouter);
app.use("/auth", authRouter);
app.use("/messages", messagesRouter);

app.get("/", (req, res) => res.send("🚀 Mega Agency Bridge Running"));

app.listen(config.port, () => {
  logger.info(`Bridge running on port ${config.port}`);
});
