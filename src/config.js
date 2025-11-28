import dotenv from "dotenv";
dotenv.config();

const config = {
  env: process.env.NODE_ENV || "production",
  port: parseInt(process.env.PORT || "3000", 10),
  adminSecret: process.env.ADMIN_SECRET || "",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "",
  dbUrl: process.env.DATABASE_URL || "",
  authEncKey: process.env.AUTH_ENC_KEY || "",
  qrPassword: process.env.QR_PASSWORD || "",
  sentryDsn: process.env.SENTRY_DSN || "",
  logLevel: process.env.LOG_LEVEL || "info"
};

export default config;
