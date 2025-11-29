import express from "express";
import { jwtAuth } from "../middleware/jwtAuth.js";
import { sendTextMessage } from "../whatsapp.js";

const router = express.Router();

router.post("/send", jwtAuth, express.json(), async (req, res) => {
  const { jid, text } = req.body || {};
  if (!jid || !text) return res.status(400).json({ error: "Missing jid or text" });
  try {
    const result = await sendTextMessage(jid, text);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message || "send failed" });
  }
});

export default router;
