import express from "express";
import { getStatus } from "../whatsapp.js";

const router = express.Router();

/* -----------------------------------------
   1️⃣ HEALTH CHECK — API RETURNS JSON
------------------------------------------ */
router.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

/* -----------------------------------------
   2️⃣ READY CHECK — WHATSAPP CONNECT STATUS
------------------------------------------ */
router.get("/ready", (req, res) => {
  const status = getStatus();
  res.json(status);
});

/* -----------------------------------------
   3️⃣ HTML DASHBOARD — BEAUTIFUL UI
------------------------------------------ */
router.get("/", (req, res) => {
  const base = `${req.protocol}://${req.get("host")}`;

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mega Agency - Status Dashboard</title>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>

      <style>
        body { 
          margin:0; 
          padding:0; 
          font-family:Arial; 
          background:#0f172a; 
          color:#e2e8f0;
        }
        .container {
          max-width:900px;
          margin:30px auto;
          padding:20px;
        }
        h1 { margin-bottom:6px; }
        .card {
          background:#1e293b;
          padding:20px;
          border-radius:12px;
          margin-bottom:20px;
        }
        a {
          color:#38bdf8;
          display:block;
          margin:8px 0;
          font-size:18px;
          text-decoration:none;
        }
        .badge {
          padding:6px 12px;
          border-radius:20px;
          font-weight:bold;
        }
        .ok { background:#065f46; color:#bbf7d0; }
        .bad { background:#7f1d1d; color:#fecaca; }
        button {
          background:#0ea5a1;
          border:none;
          color:#01221f;
          font-weight:bold;
          padding:10px 16px;
          border-radius:8px;
          cursor:pointer;
        }
      </style>

      <script>
        async function refreshStatus() {
          const healthRaw = await fetch('${base}/status/health').then(r=>r.json()).catch(()=>null);
          const readyRaw = await fetch('${base}/status/ready').then(r=>r.json()).catch(()=>null);

          document.getElementById("health").innerText = JSON.stringify(healthRaw, null, 2);
          document.getElementById("ready").innerText  = JSON.stringify(readyRaw, null, 2);

          document.getElementById("healthBadge").className =
            "badge " + (healthRaw?.status === "ok" ? "ok" : "bad");

          document.getElementById("readyBadge").className =
            "badge " + (readyRaw?.connected ? "ok" : "bad");

          document.getElementById("readyBadge").innerText =
            readyRaw?.connected ? "CONNECTED" : "DISCONNECTED";

          // Refresh QR image cache
          document.getElementById("qrImg").src = "${base}/admin/qr.png?ts=" + Date.now();
        }

        setInterval(refreshStatus, 5000);
        window.onload = refreshStatus;
      </script>
    </head>

    <body>
      <div class="container">

        <h1>🚀 Mega Agency — Status Dashboard</h1>
        <p>Live Status of WhatsApp Bridge</p>

        <!-- ========================== -->
        <!-- SERVER HEALTH CARD        -->
        <!-- ========================== -->
        <div class="card">
          <h2>Server Health</h2>
          <span id="healthBadge" class="badge ok">OK</span>
          <pre id="health" style="margin-top:10px;"></pre>
        </div>

        <!-- ========================== -->
        <!-- WHATSAPP STATUS           -->
        <!-- ========================== -->
        <div class="card">
          <h2>WhatsApp Connection</h2>
          <span id="readyBadge" class="badge bad">LOADING...</span>
          <pre id="ready" style="margin-top:10px;"></pre>
        </div>

        <!-- ========================== -->
        <!-- USEFUL LINKS               -->
        <!-- ========================== -->
        <div class="card">
          <h2>Useful Links</h2>
          <a href="${base}/status/health" target="_blank">Health (JSON)</a>
          <a href="${base}/status/ready" target="_blank">Ready (JSON)</a>
          <a href="${base}/" target="_blank">Home</a>
          <a href="${base}/admin/qr" target="_blank">Admin QR</a>
          <a href="${base}/admin/qr.png" target="_blank">QR PNG</a>
        </div>

        <!-- ========================== -->
        <!-- QR Preview                 -->
        <!-- ========================== -->
        <div class="card">
          <h2>QR Preview</h2>
          <img id="qrImg" src="${base}/admin/qr.png" width="220" style="border-radius:8px; border:1px solid #334155;">
          <br><br>
          <button onclick="refreshStatus()">Refresh Now</button>
        </div>

      </div>
    </body>
    </html>
  `);
});

/* -----------------------------------------
   EXPORT AS ESM DEFAULT
------------------------------------------ */
export default router;
