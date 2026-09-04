# DumuWaks: WhatsApp-First Strategy Report

**Date:** April 11, 2026
**Authors:** Munene & Marita
**Status:** Approved after partner deliberations

---

## Executive Summary

After extensive deliberation, we are shifting DumuWaks from a web-first to a **WhatsApp-first platform** while retaining the existing web application for administration, technician portfolio management, and analytics. This report documents the strategic rationale, technical approach, phased roadmap, and multi-channel architecture that ensures no customer is left behind — including those without WhatsApp or smartphones.

The core insight: **WhatsApp is already where our market lives.** Kenyan homeowners already find technicians through scattered WhatsApp groups. DumuWaks formalises that trust channel with verified technicians, transparent pricing, escrow protection, and AI-powered matching — all accessible without downloading a single app.

---

## 1. Strategic Rationale

### The Problem We're Solving

Kenya's informal home services sector is fragmented:

- **150,000+ skilled technicians** nationwide earn inconsistent income, averaging 8-12 jobs per month
- **Homeowners** face inflated pricing, unreliable arrivals, and zero accountability
- **WhatsApp groups** have become the de facto trust channel, but with no structure, no verification, and no payment protection

### Why WhatsApp-First

| Factor | Web App | WhatsApp |
|---|---|---|
| **User acquisition cost** | High (app download / URL discovery) | Near-zero (share a phone number) |
| **Onboarding friction** | Email registration, password, verification | Send "Hi" — done |
| **Daily active usage** | Low (purpose-driven visits) | Already open — 80%+ of Kenya smartphone users |
| **Trust signal** | Brand new app, unfamiliar | Same app they message family in |
| **Feature phone reach** | None | SMS/USSD fallback covers 100% |
| **Technician adoption** | Requires app training | Already proficient |

**Competitors in this space do not offer WhatsApp integration.** This is our key differentiator and market entry advantage.

### What the Web App Remains For

- **Admin dashboard** — platform analytics, user management, pricing configuration, dispute resolution
- **Technician profiles** — portfolio management, work gallery, earnings analytics, subscription management
- **SEO landing pages** — search engine discoverability, service category pages, trust-building content
- **Corporate clients** — bulk booking management, team administration, billing

---

## 2. Technical Architecture

### Multi-Channel Entry Points

```
CUSTOMERS                        TECHNICIANS
─────────────────────            ─────────────────────
WhatsApp    (primary)            WhatsApp (live job ops)
SMS         (feature phones)     Web App  (profile/analytics)
USSD        (zero internet)      SMS      (fallback alerts)
Web App     (power users)
Agent-assisted (phone/walk-in)
        │                              │
        ▼                              ▼
┌──────────────────────────────────────────────┐
│         Unified Message Gateway               │
│   WhatsApp | SMS | USSD → same API calls      │
└──────────────────┬───────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
  BookingService  MpesaService  NotificationService
  MatchingService EscrowService SupportService
        │          │          │
        └──────────┼──────────┘
                   ▼
            MongoDB Atlas
```

**Zero duplication of business logic.** The WhatsApp gateway is a translation layer — it converts messages into the same API calls the web app already makes. The booking state machine, M-Pesa integration, AI matching engine, and escrow system are unchanged.

### Existing Infrastructure Leveraged

| Component | Status | WhatsApp Integration |
|---|---|---|
| Booking FSM (12 states) | Built | Drives conversation state 1:1 |
| M-Pesa STK Push + B2C payouts | Built | Triggered by WhatsApp confirmation |
| Africa's Talking SMS | Built | Same provider offers WhatsApp API |
| Notification service (email, SMS, push) | Built | Add WhatsApp as 4th channel |
| Webhook infrastructure | Built | Reuse pattern for WhatsApp callbacks |
| Socket.IO real-time | Built | Retained for web app tracking |
| AI matching engine | Built | No change needed |
| Support ticket system | Built | WhatsApp thread IDs attached to tickets |

### Provider Decision

**Africa's Talking WhatsApp API** — not Meta direct. Rationale:

- Already integrated for SMS — same SDK, same API key, same billing
- Local Kenya-based company with local support
- Handles Meta business verification on our behalf
- Unified dashboard for SMS + USSD + WhatsApp + Voice
- Eliminates 2-3 week Meta verification delay

### Cost Model

| Message Type | Cost (Kenya) | When |
|---|---|---|
| Service conversations (customer-initiated) | **FREE** | Customer messages first, we reply within 24h |
| Utility templates (booking confirmations, status updates) | ~KES 0.80 | Proactive outbound notifications |
| Marketing templates (reminders, re-engagement) | ~KES 3.00 | Growth campaigns |
| Authentication templates (OTP) | ~KES 0.80 | Phone verification |

At projected volumes (6,000 technicians, 5,000+ jobs/year 1), monthly messaging costs remain under **KES 15,000** — negligible compared to SMS costs for the same reach.

---

## 3. Customer Journey: WhatsApp Booking Flow

### Complete Flow (Under 2 Minutes)

```
Customer: "Hi"
Bot: Welcome to DumuWaks! What service do you need?
     > Plumbing  > Electrical  > Carpentry  > Painting  > Other

Customer: Plumbing
Bot: What specifically?
     > Leak repair  > Pipe installation  > Blocked drain

Customer: Leak repair
Bot: [WhatsApp Flow opens — native form inside WhatsApp]
     • Describe the problem        [text field]
     • Upload a photo              [camera/gallery]
     • Your location               [location picker]
     • Preferred time              [date/time]
     • [Submit]

Bot: "Leak repair in Westlands
      Estimated: KES 800 - 1,200
      Booking fee (20%): KES 200"
     [Confirm & Pay]  [Ask a Question]  [Cancel]

Customer: Confirm & Pay
→ M-Pesa STK push to customer's phone
→ Payment confirmed via webhook

Bot: "Booking #DW-1042 confirmed! Finding your technician..."
→ AI matching runs (< 2 minutes)

Bot: "James M. (4.8 stars) assigned
      ETA: ~22 minutes"
     [Track James]  [Call James]

→ Status updates: en route → arrived → in progress → complete

Bot: "James has completed the work. Approve?"
     [Approve]  [Dispute]

Customer: Approve
→ M-Pesa STK push for remaining 80%

Bot: "All done! Rate James:"
     [1] [2] [3] [4] [5]
```

### Always-Available Commands

Customers can text these at any time:
- `STATUS` — current booking status
- `CANCEL` — cancel with reason prompt
- `SUPPORT` — open a support ticket
- `HISTORY` — last 3 bookings
- `HELP` — list available commands

---

## 4. Technician Journey: WhatsApp as Operations Hub

Technicians use the web app for profile, portfolio, and analytics. WhatsApp becomes their **primary live operations tool**.

### Job Alert & Execution

```
Bot → James: New Job - Leak Repair
      Westlands (2.1km away) | KES 1,020 payout
      [Accept]  [Decline]  [Details]

James: Accept
Bot: Customer address + Google Maps link
     [I'm on my way] [I've arrived] [Start work]

→ Each status update notifies the customer automatically

James: Work done → uploads completion photos
Bot: "Customer will review and approve."
→ Customer approves

Bot: "KES 1,020 sent to your M-Pesa. Ref: QJH8X2K1"
```

### Technician Onboarding via WhatsApp Flow

New technicians can onboard entirely through WhatsApp — no website visit required:

- Upload ID photo (KYC)
- Selfie verification
- Select skills and categories
- Set hourly rate and service area (drop a pin)
- Submit for verification

This eliminates the onboarding friction barrier that kills adoption in informal labour markets.

---

## 5. Customer Service: Hybrid Automation + Human Handoff

### Automated Triage

```
Customer: "I have a problem"
Bot: "What kind of issue?"
     [Payment problem]  [Technician issue]  [Other]

Customer: Payment problem
Bot: (pulls booking automatically)
     "Booking #DW-1042, KES 200 paid. What happened?"
     [Not confirmed]  [Overcharged]  [Refund request]
```

### Human Handoff

When the bot cannot resolve, it:
1. Creates a support ticket in the system
2. Assigns to the least-busy support agent (existing auto-assignment)
3. Agent responds directly from WhatsApp Business App on their phone
4. Full conversation history visible in admin dashboard

No special software for support agents — they respond from the same WhatsApp they already use daily.

---

## 6. Reaching Everyone: The Fallback Stack

### SMS (Feature Phones + Low Data)

Africa's Talking SMS — already integrated. Extended with two-way keyword commands:

```
BOOK PLUMBING → address prompt → quote → YES to confirm → M-Pesa
STATUS → current booking info
CANCEL → cancellation flow
```

All SMS commands route through the same booking API — different input, same backend.

### USSD (Zero Internet, Any Phone)

Via Africa's Talking USSD API. Works on KES 2,000 feature phones with 2G and no data plan.

```
*384*XXX#
1. Book a service
2. My bookings
3. Contact support
```

Menu-driven booking → M-Pesa confirmation via SMS. The most inclusive access channel — critical for rural and low-income market segments.

### Agent-Assisted (Phone Call)

Customer calls → support agent creates booking on their behalf via admin dashboard. Existing endpoints (`/support/create-customer`, `/support/create-booking`) already support this — no new development needed.

---

## 7. Revenue Model Alignment

The WhatsApp-first approach amplifies the existing commission model:

| Plan | Commission | WhatsApp Advantage |
|---|---|---|
| **Free** | 15% | Lower acquisition cost → more technicians onboard |
| **Pro** | 12% | Boosted visibility in matching → more jobs via WhatsApp alerts |
| **Premium** | 10% | Priority matching + featured catalog listing |

**New revenue opportunity:** WhatsApp catalog allows in-chat service browsing with pricing — reducing quote-to-booking drop-off significantly.

---

## 8. Implementation Roadmap

| Phase | Deliverable | Timeline | Outcome |
|---|---|---|---|
| **1** | AT WhatsApp setup + webhook infrastructure + session model | Week 1-2 | Foundation in place |
| **2** | Outbound templates (confirmations, job alerts, payment receipts) | Week 2-3 | Immediate customer/technician notifications via WhatsApp |
| **3** | Customer inbound booking flow (conversation → booking → M-Pesa) | Week 3-5 | Core WhatsApp-first journey live |
| **4** | Technician accept/decline + status updates via WhatsApp | Week 5-6 | Full booking loop via WhatsApp |
| **5** | WhatsApp Flows (rich booking form, technician KYC onboarding) | Week 6-8 | Structured forms replace chatbot Q&A |
| **6** | Customer service automation + human handoff | Week 8-9 | Support tickets via WhatsApp |
| **7** | SMS two-way booking commands | Week 9-10 | Feature phone reach |
| **8** | USSD booking flow | Week 10-12 | Zero-internet coverage |
| **9** | Service catalog + proactive re-engagement | Week 12-14 | Growth and retention |

### Immediate Actions (This Week)

1. **Submit WhatsApp template messages for approval** — approval takes days; start now
2. **Register Africa's Talking WhatsApp channel** — same account as existing SMS
3. **Reserve dedicated WhatsApp phone number** (+254)

---

## 9. Success Metrics

| Metric | Target (Year 1) |
|---|---|
| WhatsApp bookings as % of total | > 60% |
| Booking completion time (first message → confirmed) | < 2 minutes |
| Technician response time (alert → accept) | < 5 minutes |
| Emergency response (booking → technician arrival) | < 2 hours |
| Feature phone bookings (SMS + USSD) | > 15% of total |
| Jobs generated | 5,000+ |
| Technician income increase | 30-50% |
| Verified technicians | 6,000 by Year 3 |

---

## 10. Risk Mitigation

| Risk | Mitigation |
|---|---|
| Meta policy changes / API restrictions | Multi-channel architecture (SMS, USSD always available) |
| Africa's Talking downtime | Automatic SMS fallback for critical notifications |
| WhatsApp template rejection | Pre-draft multiple variants; submit early |
| Customer confusion with bot | Clear human handoff; "type AGENT for a real person" |
| Technician adoption resistance | Onboarding via the WhatsApp they already use — no new tools |
| Feature phone exclusion | USSD and SMS fully functional booking channels |

---

## Conclusion

This is not a pivot away from technology — it is a pivot toward accessibility. The web app, API, matching engine, escrow system, and payment infrastructure remain unchanged. What changes is the front door: instead of asking 150,000 technicians and millions of homeowners to download an app or visit a URL, we meet them exactly where they already are — WhatsApp, SMS, or a simple phone call.

The platform is built. The infrastructure is ready. This strategy puts it in everyone's pocket.

---

*DumuWaks — Professional maintenance and repair services, accessible to everyone.*
