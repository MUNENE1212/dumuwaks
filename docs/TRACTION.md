# Traction KPIs

The weekly review numbers, computed from data the platform already records.
Service: `backend/src/services/traction.service.js`.

| Figure | Definition |
| --- | --- |
| Technicians registered / verified | `role: technician`, not deleted / with `kyc.verified` |
| Customers registered | `role: customer`, not deleted |
| Completed jobs per week | Bookings in `completed`, `verified`, `payment_pending` or `paid`, by `actualEndTime` (else `updatedAt`). Weeks start Monday 00:00 EAT |
| Repeat customer rate | Customers with 2+ completed jobs ÷ customers with 1+ (all time) |
| In-app payment share | Completed jobs in the window whose escrow was funded ÷ completed jobs in the window |
| Platform revenue by month | Sum of `platform_share` ledger entries, KES (admin only) |

## Endpoints

- `GET /api/v1/admin/analytics/traction?weeks=12` — admin, includes revenue. Shown at **Admin → Traction**.
- `GET /api/v1/public/traction` — public, aggregate counts only (no revenue, no per-user data), cached for an hour. CORS allows `https://munene1212.github.io` so the founder portfolio can show live figures.
