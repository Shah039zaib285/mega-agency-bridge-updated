import express from "express";
import QRCode from "qrcode";
import basicAuth from "../middleware/basicAuth.js";

let latestQr = null;
export function setLatestQr(qr) { latestQr = qr; }

const router = express.Router();

router.get("/qr", basicAuth, async (req, res) => {
  if (!latestQr) return res.status(404).send("No QR available");
  const dataUrl = await QRCode.toDataURL(latestQr);
  res.send(`
    <html><body style="font-family:sans-serif">
    <h3>Scan QR</h3>
    <img src="${dataUrl}" />
    </body></html>
  `);
});

router.get("/qr.png", basicAuth, async (req, res) => {
  if (!latestQr) return res.status(404).send("No QR available");
  const buffer = await QRCode.toBuffer(latestQr, { type: "png", width: 320 });
  res.setHeader("Content-Type", "image/png");
  res.send(buffer);
});

export default router;
