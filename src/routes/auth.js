import express from "express";
import jwt from "jsonwebtoken";
import config from "../config.js";

const router = express.Router();

router.post("/login", express.json(), (req, res) => {
  const { secret } = req.body || {};
  if (!secret || secret !== config.adminSecret) {
    return res.status(401).json({ error: "Invalid admin secret" });
  }
  const payload = { role: "admin" };
  const accessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: "15m" });
  const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: "7d" });
  res.json({ accessToken, refreshToken });
});

export default router;
