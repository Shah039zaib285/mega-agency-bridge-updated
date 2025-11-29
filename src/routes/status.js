import express from "express";
import { getStatus } from "../whatsapp.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

router.get("/ready", (req, res) => {
  const status = getStatus();
  res.json(status);
});

export default router;
