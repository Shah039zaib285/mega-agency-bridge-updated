import express from "express";
import { sendTextMessage } from "../whatsapp.js";
import { jwtAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/send", jwtAuth, express.json(), async (req, res, next) => {
  try {
    const { jid, text } = req.body || {};
    if (!jid || !text) {
      return res.status(400).json({ error: "Missing jid or text" });
    }
    const result = await sendTextMessage(jid, text);
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});

export default router;
