# WhatsApp channel

Customers book, check status and reach a person on WhatsApp; the platform sends
booking and M-Pesa updates to the same chat. Free to run: self-hosted
[Evolution API v2](https://doc.evolution-api.com) linked to one WhatsApp number
(Baileys / "Linked devices"), the same stack Emen already runs in `baitech-infra/`.

```
Customer's WhatsApp ─▶ Dumuwaks number (phone, linked device)
                          │
            Evolution API (docker, 127.0.0.1:8083)   baitech-infra/dumuwaks-evolution
                          │  POST http://host.docker.internal:5000/api/v1/whatsapp/webhook/<secret>
                          ▼
            dumuwaks-backend (PM2, :5000)
              ├─ bot.service      conversation → WhatsAppRequest (support inbox)
              ├─ notifier.service every booking/payment Notification → WhatsApp
              └─ /whatsapp-desk   support/admin: link phone (QR), inbox, reply
```

## Why Evolution and not OpenClaw

OpenClaw is the director's internal PA: its WhatsApp channel is allowlisted and
every `/hooks/agent` call runs a full LLM turn that the gateway serialises
(`baitech-infra/CLAUDE.md` records an 89 s lane wait). Customer traffic would
queue behind the director's work and cost a model call per message. Evolution is
a plain gateway: the Dumuwaks bot is deterministic code, costs nothing per
message, and stays up when an LLM provider does not.

The Ementech CRM instance (`evolution-api/`, :8080) posts **every** event to the
Ementech backend through its global webhook, so Dumuwaks gets its own isolated
instance (like `ardalink-evolution/`), with no global webhook.

## Set up (once, on the VPS)

1. **Gateway**
   ```bash
   cd /opt/baitech-infra/dumuwaks-evolution
   cp .env.example .env    # set DUMUWAKS_EVOLUTION_POSTGRES_PASSWORD and AUTHENTICATION_API_KEY
   docker compose up -d
   curl -s http://127.0.0.1:8083/ | head -c 120   # "Welcome to the Evolution API"
   ```
2. **Backend env** (`/var/www/dumuwaks/shared/backend.env`):
   ```
   WHATSAPP_ENABLED=true
   EVOLUTION_API_URL=http://127.0.0.1:8083
   EVOLUTION_API_KEY=         # same value as AUTHENTICATION_API_KEY in step 1
   EVOLUTION_INSTANCE=dumuwaks
   WHATSAPP_WEBHOOK_SECRET=<openssl rand -hex 24>
   WHATSAPP_WEBHOOK_BASE_URL=http://host.docker.internal:5000
   SITE_URL=https://dumuwaks.co.ke
   ```
   `pm2 reload dumuwaks-backend --update-env`. The container reaches the host on
   the docker bridge; if `ufw` is on, allow it: `ufw allow in on docker0 to any port 5000`.
3. **Link the phone**: sign in as admin → **WhatsApp** (`/whatsapp-desk`) →
   **Link phone** → on the Dumuwaks phone, *Settings → Linked devices → Link a device*
   and scan. The chip turns **Linked**. Linking also sets the instance webhook.
4. **Frontend**: set `VITE_WHATSAPP_NUMBER=2547XXXXXXXX` in
   `/var/www/dumuwaks/shared/.env.frontend` so every "WhatsApp" button opens the
   linked number (default: the company line `254799954672`).

Smoke test: message the number `hi` → menu; `2` → status.

## What the bot does

| Send | Result |
|---|---|
| `hi`, `MENU` | Menu: 1 Book · 2 Status · 3 Person · 4 Join |
| `BOOK` / `1` | Category → description (photo ok) → location pin or text → when → **request WR-YYMMDD-NNNN** in the desk |
| `STATUS` / `2` | Up to 3 active bookings for the account on this number, plus open requests |
| `HELP` / `3` | Opens a "wants a person" request; bot stays quiet 12 h (`MENU` resumes) |
| `JOIN` / `4` | Technician onboarding steps + register link; request in the desk |
| `STOP` / `START` | Turns WhatsApp updates off/on |
| free text naming a trade | "my sink is leaking" → skips to location |

Requests are turned into real bookings with the existing support tools
(`POST /support/create-customer`, `/support/create-booking`); once the booking
exists its updates reach the customer here automatically.

## Outbound updates

`notification.service.createNotification()` hands every stored notification to
`whatsapp/notifier.service.deliver()`. Sent: booking lifecycle (accepted, en
route, arrived, completed, counter-offers, completion requests) and payments
(received, failed, payout, refund). Not sent: social, marketing, chat messages
(opt-in). Skipped when the user sent STOP or switched it off in **Settings →
WhatsApp updates**. Failures never break the booking flow; they are recorded in
`Notification.deliveryStatus.whatsapp`.

## Safety limits

- One send queue per process, ≥1.2 s apart (`WHATSAPP_SEND_INTERVAL_MS`).
- Sends fail fast when the phone is unlinked (state cached 60 s and updated by
  `connection.update` webhooks) instead of hanging the queue.
- Timeouts are never retried (the message may have gone out); only 429/5xx and
  refused connections are.
- Redelivered webhooks are deduplicated by message id.
- Messages go only to people who wrote first or hold an account. Linked-device
  WhatsApp is unofficial; bulk or cold messaging gets numbers banned. If volume
  grows past a few hundred conversations a day, move the same instance to
  Evolution's `WHATSAPP-BUSINESS` (Meta Cloud API) integration — the backend code
  does not change.

## API

| Route | Who |
|---|---|
| `POST /api/v1/whatsapp/webhook/:secret` | Evolution |
| `GET /api/v1/whatsapp/status` | support, admin |
| `GET /api/v1/whatsapp/requests?status=open&kind=booking` | support, admin |
| `PATCH /api/v1/whatsapp/requests/:id` `{status, assignToMe, booking, note}` | support, admin |
| `POST /api/v1/whatsapp/send` `{phone, text, requestId?}` | support, admin |
| `POST /api/v1/whatsapp/connect` `{number?}` → QR / pairing code | admin |
| `POST /api/v1/whatsapp/webhook-sync`, `/logout` | admin |

Tests: `backend/tests/whatsapp.test.js`, `backend/tests/whatsappEvolution.test.js`.
