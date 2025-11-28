import express from "express";
import jwt from "jsonwebtoken";
import config from "../config.js";

const router = express.Router();

// Admin login using ADMIN_SECRET
router.post("/login", express.json(), (req, res) => {
  const { secret } = req.body || {};
  if (!secret || secret !== config.adminSecret) {
    return res.status(401).json({ error: "Invalid admin secret" });
  }

  const payload = { role: "admin" };
  const accessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: "15m" });
  const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: "7d" });

  return res.json({ accessToken, refreshToken });
});

router.post("/refresh", express.json(), (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: "Missing refreshToken" });

  try {
    const payload = jwt.verify(refreshToken, config.jwtRefreshSecret);
    const accessToken = jwt.sign({ role: payload.role }, config.jwtSecret, {
      expiresIn: "15m"
    });
    return res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});

export default router;
