# Payments & escrow (IntaSend)

Every booking's full agreed price is collected by M-Pesa into an IntaSend
escrow wallet. It stays there until the customer confirms the work (or 3 days
pass after completion with no problem reported), then goes to the technician.
Cancellations and disputes send money back to the customer.

```
Customer ──STK push──▶ IntaSend ESCROW wallet (WORKING, can_disburse)
                         ├─ technician share ──▶ M-Pesa B2C / PesaLink bank
                         ├─ platform share  ──▶ SETTLEMENT wallet (Emen revenue)
                         └─ refunds         ──▶ the M-Pesa number that paid
```

Code: `backend/src/services/payments/` · Tests: `backend/tests/payments.test.js`.

## Money rules

| Rule | Value (source: `backend/src/config/fees.js`) |
|---|---|
| Customer pays | the agreed price, nothing added |
| Platform fee | 7.5% (min KES 50, max KES 5,000) + 16% VAT, taken from the technician's share |
| Technician receives | 91.3% of the price for typical jobs |
| IntaSend collection & payout charges | absorbed by the platform share |
| Auto-release | 3 days after the technician marks the job done, if nothing is reported |
| Auto-refund | 14 days after payment if the job never started |
| Cancellation by customer | >24 h: 0% · 6–24 h: 25% · 2–6 h: 50% · <2 h: 75% goes to the technician (less platform fee) |
| Cancellation by technician/admin | full refund |
| Dispute | money frozen; admin resolves: technician / customer / split |
| Minimum job | `MIN_JOB_AMOUNT` (default KES 500) — below it charges exceed the fee |

## How it stays correct

- **Ledger.** `LedgerEntry` is append-only (updates/deletes throw). Each escrow's
  held balance = Σin − Σout; across all escrows it must equal the escrow
  wallet's balance. `jobs/payments.jobs.js` reconciles daily at 06:00 EAT and
  alerts staff (socket + WhatsApp to `PAYMENTS_ALERT_PHONE`) on any difference.
- **IntaSend is the source of truth.** Webhooks are only a trigger: the
  collection or payout status is re-read from IntaSend before anything is
  recorded. Amount and `api_ref` must match.
- **Exactly once.** Status changes are compare-and-set; ledger entries,
  payouts and webhook events have unique keys. Webhook + poller racing, a
  double tap on "Pay", or a customer confirming twice all produce one effect.
- **No double payouts.** A payout is marked `initiated` before IntaSend is
  called. A timeout (outcome unknown) goes to **needs review** and is never
  re-sent automatically.
- **Held for a human:** payouts above `PAYOUT_APPROVAL_THRESHOLD` (default
  KES 50,000), payouts to details changed in the last 24 h, technicians with no
  payout details, and every failed payout. Admins approve in **Admin → Finance**.
- **Payout details** need a 6-digit code sent to the receiving M-Pesa line (or
  the account phone for a bank). A change alerts the account phone.
- **Sandbox keys are refused in production** and live keys outside it
  (`config/payments.js#assertSafe`).

## Setup

1. **IntaSend account** — sign up at <https://payment.intasend.com> and complete
   business verification: director ID, certificate of incorporation, CR12, KRA
   PIN, business details, live screening. Before going live, ask IntaSend for:
   - their **CBK authorisation** letter, and how client funds are held (trust
     account at which bank) — the escrow relies on it;
   - the actual **B2C and PesaLink charges** (their pricing page and API docs
     disagree: KES 100 vs KES 10);
   - confirmation that `send-money/initiate` debits the `wallet_id` passed
     (the escrow wallet) and honours `idempotency_key`.
2. **Keys** — dashboard → Settings → API Keys (sandbox first).
3. **Escrow wallet**
   ```bash
   cd backend
   INTASEND_ENV=sandbox INTASEND_SECRET_KEY=ISSecretKey_test_... npm run payments:setup
   # → INTASEND_ESCROW_WALLET_ID=XXXXXX
   ```
4. **Webhook** — dashboard → Webhooks → URL
   `https://dumuwaks.co.ke/api/v1/payments/intasend/webhook`, and a long random
   challenge (`openssl rand -hex 24`) → `INTASEND_WEBHOOK_CHALLENGE`.
5. **Backend env**
   ```
   PAYMENTS_ENABLED=true
   INTASEND_ENV=sandbox            # live in production
   INTASEND_PUBLISHABLE_KEY=ISPubKey_...
   INTASEND_SECRET_KEY=ISSecretKey_...
   INTASEND_ESCROW_WALLET_ID=...
   INTASEND_WEBHOOK_CHALLENGE=...
   PAYOUT_APPROVAL_THRESHOLD=50000
   MIN_JOB_AMOUNT=500
   PAYMENTS_ALERT_PHONE=254799954672
   ```
   `pm2 reload dumuwaks-backend --update-env`. Jobs start on PM2 instance 0 only.

Every booking uses escrow (`booking.paymentProvider` defaults to `intasend`).
Until `PAYMENTS_ENABLED=true` and the keys are set, the booking page tells the
customer payments are being switched on instead of showing the Pay button. The
old 20% booking-fee path is kept only so historical records still read; the
test bookings from before launch were removed on 2026-09-26 (backup in
`~/dumuwaks-backups/2026-09-26-before-job-cleanup/` on the workstation).

## Sandbox test (before going live)

1. Customer books; technician accepts; customer taps **Pay** with their own
   Safaricom number (sandbox reverses test amounts within 48 h) — KES 10 is enough.
2. Booking shows **Held**; technician can start travel (before that the API
   returns 402).
3. Technician marks done; customer confirms → payout to IntaSend's test number
   `254708374149` (set it as the technician's payout number).
4. Admin → Finance: **Reconcile now** shows a zero difference.
5. Repeat with a cancellation and a dispute split.

## API

| Route | Who |
|---|---|
| `GET /api/v1/payments/config` | public |
| `POST /api/v1/payments/intasend/webhook` | IntaSend (challenge) |
| `GET /api/v1/payments/bookings/:id/escrow` | booking parties, staff |
| `POST /api/v1/payments/bookings/:id/escrow/pay` `{phone}` | customer |
| `POST /api/v1/payments/bookings/:id/escrow/topups` `{amount, reason}` | technician |
| `POST /api/v1/payments/bookings/:id/escrow/topups/:topupId` `{approve, phone}` | customer |
| `POST /api/v1/payments/bookings/:id/escrow/dispute` `{reason}` | booking parties |
| `GET/PUT /api/v1/payments/payout-destination`, `POST …/verify` `{code}` | technician |
| `GET /api/v1/payments/bank-codes` | signed in |
| `GET /api/v1/payments/admin/overview · payouts · escrows · escrows/:id · reconciliation` | support, admin |
| `POST /api/v1/payments/admin/payouts/:id/approve`, `/escrows/:id/resolve`, `/reconciliation` | admin |
| `POST /api/v1/payments/admin/payouts/:id/refresh` | support, admin |

The Daraja-based routes (`/payments/mpesa/*`, `/payments/payouts/*`,
`/bookings/:id/booking-fee/*`) remain for legacy bookings only; the STK route
refuses escrow bookings.
