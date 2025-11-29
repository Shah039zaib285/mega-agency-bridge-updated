import dotenv from "dotenv";
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  adminSecret: process.env.ADMIN_SECRET || "admin_secret_change_me",
  jwtSecret: process.env.JWT_SECRET || "jwt_secret_change_me",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "jwt_refresh_secret_change_me",
  qrPassword: process.env.QR_PASSWORD || "qr_password_change_me",
  n8nWebhook: process.env.N8N_WEBHOOK_INCOMING || "",
  openaiKey: process.env.OPENAI_API_KEY || "",
  logLevel: process.env.LOG_LEVEL || "info"
};

export default config;
