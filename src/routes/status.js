import express from "express";
import { getStatus } from "../whatsapp.js";
const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

router.get("/ready", (req, res) => {
  try {
    const status = getStatus();
    res.json(status);
  } catch (e) {
    res.json({ connected: false, error: e?.message || String(e) });
  }
});

router.get("/", async (req, res) => {
  const base = `${req.protocol}://${req.get("host")}`;
  // HTML dashboard (same as previous v2 UI)
  res.send(`<!doctype html><html>...`); // (use the detailed UI provided earlier or paste full HTML)
});

export default router;
