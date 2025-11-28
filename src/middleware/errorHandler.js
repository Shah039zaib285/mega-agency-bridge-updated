import logger from "../logger.js";

export function errorHandler(err, req, res, next) {
  logger.error({ err, url: req.originalUrl }, "Unhandled error");
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal server error" });
}
