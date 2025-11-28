import pino from "pino";
import config from "./config.js";

const logger = pino({
  level: config.logLevel || "info",
  prettyPrint: process.env.NODE_ENV !== "production"
});

export default logger;
