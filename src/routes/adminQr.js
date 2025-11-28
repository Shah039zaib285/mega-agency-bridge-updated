import express from "express";
import QRCode from "qrcode";
import basicAuth from "../middleware/basicAuth.js";

let latestQrString = null;

export function setLatestQr(qr) {
  latestQrString = qr;
}

const router = express.Router();

router.get("/qr", basicAuth, async (req, res) => {
  if (!latestQrString) return res.status(404).send("No QR available");
  const dataUrl = await QRCode.toDataURL(latestQrString);
  res.send(`
    <html>
      <head><title>WhatsApp QR</title></head>
      <body style="font-family:sans-serif; text-align:center; margin-top:40px;">
        <h2>Scan this QR in WhatsApp</h2>
        <img src="${dataUrl}" />
        <p>Linked Devices → Link a Device</p>
      </body>
    </html>
  `);
});

router.get("/qr.png", basicAuth, async (req, res) => {
  if (!latestQrString) return res.status(404).send("No QR available");
  const buffer = await QRCode.toBuffer(latestQrString, { type: "png", width: 320 });
  res.setHeader("Content-Type", "image/png");
  res.send(buffer);
});

export default router;
