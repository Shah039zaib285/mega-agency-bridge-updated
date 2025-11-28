# Mega Agency Bridge Advanced

WhatsApp Bridge using Baileys (Web WhatsApp) — optimized for Render free-tier.

Features:
- Baileys v6 integration
- Session persistence (auth folder)
- Optional encrypted backups to Postgres (Neon)
- Admin QR page protected by basic auth (QR_PASSWORD)
- JWT admin authentication for API
- Rate limiting for send endpoint
- Socket.IO events for QR and messages

## Quickstart (local)
1. Copy `.env.example` to `.env` and set values.
2. `npm install`
3. `npm start`
4. Visit `http://localhost:3000/admin/qr` (use QR_PASSWORD)

## Deploy (Render)
- Add environment variables (see `.env.example`)
- Deploy with Docker (Render will build with Dockerfile)
