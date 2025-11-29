// src/routes/status.js
const express = require('express');
const fetch = require('node-fetch');
const { getStatus } = require('../whatsapp'); // ensure this exists and exports getStatus

const router = express.Router();

function makeBase(req) {
  return `${req.protocol}://${req.get('host')}`;
}

// JSON endpoints (keeps existing API)
router.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

router.get('/ready', (req, res) => {
  try {
    const status = getStatus ? getStatus() : { connected: false };
    res.json(status);
  } catch (e) {
    res.json({ connected: false, error: e?.message || String(e) });
  }
});

// HTML Dashboard
router.get('/', async (req, res) => {
  const base = makeBase(req);
  // simple server-side attempt to get initial states (best-effort)
  let health = { status: 'unknown' };
  let ready = { connected: false };
  try {
    const h = await fetch(`${base}/status/health`).then(r => r.json()).catch(()=>null);
    if (h) health = h;
  } catch {}
  try {
    const r = await fetch(`${base}/status/ready`).then(r => r.json()).catch(()=>null);
    if (r) ready = r;
  } catch {}

  const html = `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <title>Mega Agency — Status Dashboard</title>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <style>
      body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,"Helvetica Neue",Arial;margin:0;background:#0f172a;color:#e6eef8}
      .wrap{max-width:920px;margin:28px auto;padding:20px}
      .card{background:#0b1220;border-radius:12px;padding:18px;margin-bottom:14px;box-shadow:0 6px 18px rgba(2,6,23,0.6)}
      h1{margin:0 0 6px;font-size:20px}
      p.small{margin:0;color:#9fb0ce;font-size:13px}
      .links a{display:inline-block;margin:8px 8px 8px 0;padding:8px 12px;border-radius:8px;background:#071029;color:#cfe8ff;text-decoration:none;font-weight:600}
      .status{display:flex;gap:14px;align-items:center;margin-top:12px}
      .badge{padding:8px 12px;border-radius:999px;font-weight:700}
      .ok{background:#063f2c;color:#bff7d8}
      .bad{background:#3a0d12;color:#ffcdc4}
      .muted{color:#9fb0ce}
      #qrImg{max-width:240px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);display:block;margin-top:12px}
      .row{display:flex;gap:12px;flex-wrap:wrap}
      button{background:#0ea5a1;border:none;padding:10px 14px;border-radius:8px;color:#021827;font-weight:700;cursor:pointer}
      button.ghost{background:transparent;border:1px solid rgba(255,255,255,0.06);color:#9fb0ce}
      small.note{display:block;margin-top:8px;color:#86a2c2}
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>Mega Agency — Status Dashboard</h1>
        <p class="small">One place to check server health, WhatsApp connection, and quick links.</p>

        <div class="status">
          <div>
            <div class="muted">Server Health</div>
            <div style="margin-top:6px">
              <span class="badge ${health.status === 'ok' ? 'ok' : 'bad'}" id="healthBadge">${health.status}</span>
              <span class="muted" id="healthTime" style="margin-left:12px">${health.time || ''}</span>
            </div>
          </div>

          <div>
            <div class="muted">WhatsApp</div>
            <div style="margin-top:6px">
              <span class="badge ${ready.connected ? 'ok' : 'bad'}" id="readyBadge">${ready.connected ? 'CONNECTED' : 'DISCONNECTED'}</span>
              <span class="muted" id="readyInfo" style="margin-left:12px">${ready.lastDisconnect ? JSON.stringify(ready.lastDisconnect) : ''}</span>
            </div>
          </div>
        </div>

        <div style="margin-top:14px" class="links">
          <a href="${base}/status/health" target="_blank">Health</a>
          <a href="${base}/status/ready" target="_blank">Ready</a>
          <a href="${base}/" target="_blank">Home</a>
          <a href="${base}/admin/qr" target="_blank">Admin QR (protected)</a>
          <a href="${base}/admin/qr.png" target="_blank">QR PNG</a>
        </div>

        <div class="card" style="margin-top:12px;padding:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div>
              <strong>QR Preview</strong>
              <small class="note">If QR not shown here, open the Admin QR page (password-protected)</small>
            </div>
            <div>
              <button id="refreshBtn">Refresh</button>
              <button class="ghost" id="toggleAuto">Auto: ON</button>
            </div>
          </div>

          <img id="qrImg" src="${base}/admin/qr.png" alt="QR image (may be protected)" onerror="this.style.opacity=0.5"/>
        </div>

        <div class="card">
          <h2 style="font-size:16px;margin-bottom:6px">Live Console</h2>
          <div id="console" style="white-space:pre-wrap;color:#cbe7ff;font-family:monospace;max-height:160px;overflow:auto;padding:8px;border-radius:8px;background:rgba(8,16,28,0.4)">
            Loading latest status...
          </div>
        </div>

      </div>
    </div>

  <script>
    const base = '${base}';
    const healthBadge = document.getElementById('healthBadge');
    const healthTime = document.getElementById('healthTime');
    const readyBadge = document.getElementById('readyBadge');
    const readyInfo = document.getElementById('readyInfo');
    const consoleEl = document.getElementById('console');
    const qrImg = document.getElementById('qrImg');
    const refreshBtn = document.getElementById('refreshBtn');
    const toggleAuto = document.getElementById('toggleAuto');

    let auto = true;
    let intervalId = null;

    async function fetchJson(path) {
      try {
        const r = await fetch(path, {cache: 'no-store'});
        if (!r.ok) return null;
        return await r.json();
      } catch (e) {
        return null;
      }
    }

    async function refreshStatus() {
      // Health
      const h = await fetchJson(base + '/status/health');
      if (h) {
        healthBadge.textContent = h.status || 'ok';
        healthBadge.className = 'badge ' + (h.status === 'ok' ? 'ok' : 'bad');
        healthTime.textContent = h.time || '';
      } else {
        healthBadge.textContent = 'unknown';
        healthBadge.className = 'badge bad';
        healthTime.textContent = '';
      }

      // Ready
      const r = await fetchJson(base + '/status/ready');
      if (r) {
        const conn = !!r.connected;
        readyBadge.textContent = conn ? 'CONNECTED' : 'DISCONNECTED';
        readyBadge.className = 'badge ' + (conn ? 'ok' : 'bad');
        readyInfo.textContent = r.lastDisconnect ? JSON.stringify(r.lastDisconnect) : '';
      } else {
        readyBadge.textContent = 'unknown';
        readyBadge.className = 'badge bad';
        readyInfo.textContent = '';
      }

      // Console (small)
      const logParts = [];
      logParts.push('Health: ' + (h ? JSON.stringify(h) : 'no-response'));
      logParts.push('Ready: ' + (r ? JSON.stringify(r) : 'no-response'));
      logParts.push('QR URL: ' + base + '/admin/qr (protected)');
      consoleEl.textContent = logParts.join('\\n\\n');

      // Try refresh QR (bust cache)
      qrImg.src = base + '/admin/qr.png?ts=' + Date.now();
    }

    refreshBtn.addEventListener('click', refreshStatus);
    toggleAuto.addEventListener('click', () => {
      auto = !auto;
      toggleAuto.textContent = 'Auto: ' + (auto ? 'ON' : 'OFF');
      if (auto) startAuto();
      else stopAuto();
    });

    function startAuto() {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(refreshStatus, 5000);
    }
    function stopAuto() { if (intervalId) clearInterval(intervalId); intervalId = null; }

    // start
    refreshStatus();
    startAuto();
  </script>
  </body>
  </html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

module.exports = router;
