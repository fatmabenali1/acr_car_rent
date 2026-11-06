# Athens Car Rental API

REST backend scaffold for Athens Car Rental (ACR), built with Node.js, Express 5, TypeScript, PostgreSQL and Prisma. The API prefix is `/api/v1`; public content will be bilingual (`?lang=en|el`). No instant booking is created: customers request a quote and pay a deposit only after receiving a quote reference from ACR.

## Requirements

- Node.js 20+
- PostgreSQL 14+

## Local setup

```powershell
npm install
Copy-Item .env.example .env
# Set DATABASE_URL and replace both JWT secrets in .env
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

The health check is `GET /health`; Swagger UI is available at `/api/docs`.

The local `.env` used during development is ignored by Git. Its current connection settings assume a local PostgreSQL instance on port `5432`, with the default `postgres` user and database `athens_car_rental`. Update `DATABASE_URL` if your PostgreSQL user, host, port, or database name differs. Never commit or share `.env`.

## Implemented

Public read endpoints are available under `/api/v1`:

- `GET /home`
- `GET /vehicles` (filters: `group`, `transmission`, `seats`, `fuel`; pagination: `page`, `limit`)
- `GET /vehicles/:slug`
- `GET /vehicle-groups`
- `GET /locations` and `GET /locations/:slug`
- `GET /extras`, `/rental-info`, `/faq`, `/offers`, `/reviews`, `/pages/:slug`, `/contact-info`
- `POST /pricing/estimate` (vehicle category, dates, locations and requested extras)
- `POST /quotes` (validated quote request; does not create an instant booking)
- `GET /quotes/:reference?email=...` (quote status)
- `POST /contact` (reCAPTCHA-protected contact form)
- `POST /payments/init`, `POST /payments/callback`, `GET /payments/:id/status` (hosted deposit checkout; no card data is handled by this API)
- `/admin/*` administration endpoints (JWT access/refresh, ADMIN/STAFF roles, pagination and audit log)
- `POST /api/v1/availability/check` (category-level availability; does not promise a specific model)
- `/api/v1/admin/availability/blocks` (manual date-range blocks; ADMIN only)

Public content endpoints accept `?lang=en` or `?lang=el` (English is the default). The seed contains bilingual placeholders for missing editorial content and prices.

Run unit tests with `npm test`. The PostgreSQL-backed quote and contact workflow integration test is opt-in: set `$env:RUN_DATABASE_TESTS='true'` in PowerShell before `npm test`. It uses mocked reCAPTCHA responses and removes its temporary records afterward.

## Current scope

The application structure, security middleware, environment validation, OpenAPI entry point, PostgreSQL schema, bilingual seed, public read endpoints, database-driven pricing estimates, quote requests, contact messages, hosted payment workflow, admin routes and category-level availability are implemented.

Quote requests require a valid reCAPTCHA v3 token with action `quote_request`; contact messages require action `contact`. Configure `RECAPTCHA_SECRET_KEY`, `RECAPTCHA_MIN_SCORE` and (recommended) `RECAPTCHA_EXPECTED_HOSTNAMES`. Outgoing customer and agency emails are stored in a transactional outbox and delivered/retried by the worker when SMTP is configured (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`). Both form endpoints return HTTP 202 after the message is stored; `notificationStatus` is `queued` until delivery. If SMTP is not configured, email records remain queued.

The quote reference is four digits and two uppercase letters. Quote requests validate age, licence tenure, international permit eligibility, pickup/return dates, short-rental locations and local operating hours. Country exemptions are configurable in the seeded `rental-policy` setting. The requested category and extras are stored with the quote; the quote remains `NEW` until ACR sends and confirms a separate offer. Never pass card information through this workflow.

Vehicle category and policy details absent from the source brief remain `null` or explicit `TODO` values. No rental prices or offer discounts are seeded. Configure seasonal `PricePlan` rows only with approved company rates. An estimate with incomplete seasonal rates, extra prices, offer discounts, delivery fees, or airport night fees returns `totalEur: null` and explicit warnings rather than inventing a charge.

The estimate uses the rental policy's configured return grace period (three hours in the seed), rounds billable days up, selects the configured duration-tier rate for each day/season, applies eligible configured offer discounts to the vehicle subtotal, and calculates extra charges only when both the price and its `PER_DAY`/`PER_RENTAL` unit are configured. Rentals under five days are restricted to free pickup and return locations. Rates are managed from the database; no public price list is exposed.

Payment details are entered only on a provider-hosted checkout: card numbers, CVVs and other card data must never be collected or stored by this API. `PAYMENT_PROVIDER` accepts `mock` (the local development checkout can simulate success, failure and cancellation) or `alphabank`. The Alpha Bank adapter intentionally returns an explicit not-implemented error until the bank's official integration documentation is supplied; no bank-specific endpoint, field or signature scheme has been assumed. `ALPHABANK_INTEGRATION_CONFIG` is reserved for the configuration agreed from that documentation and is not interpreted by the current stub. Set `PAYMENT_PORTAL_URL` to the real customer portal URL before using `send-quote`; the API adds the quote reference as a query parameter and does not invent a portal domain.

Payment initialization requires a valid reCAPTCHA v3 token with action `payment_init`. The payment callback is signature-checked by the selected provider and stores only an allowlisted, non-sensitive callback summary. The vehicle category's `cdwExcessEur` is returned as a pre-authorization reminder (held on the card at pickup, not charged); cancellation deposit-refund notice days are read from `rental-policy.cancellationNoticeDaysByVehicleCode`. The seed configures 7 days for standard/automatic categories and 15 days for SUV/minivan categories. Categories not covered by the requested policy (currently luxury) remain unconfigured and direct the customer to contact ACR.

The first administrator is created by `npm run db:seed` only when both `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set in the environment. The password must be at least 12 characters and is stored as a bcrypt hash; it is never included in the seed source or logs. `/api/v1/admin/auth/login` is limited to five failed attempts per 15 minutes. Access JWTs last 15 minutes; refresh JWTs last seven days, are stored hashed and rotated on use. STAFF can read and manage quotes; all other admin resources require ADMIN. Uploaded local files accept JPEG, PNG or WebP up to `ADMIN_UPLOAD_MAX_BYTES` and are served from `/uploads`.

The admin quote `send-quote` action transitions to `QUOTE_SENT` and queues a bilingual `quote_offer` in the email outbox. The quote offer and deposit-paid customer/agency notifications include localized text and HTML bodies; delivery uses the existing retryable outbox. Configure `AGENCY_PHONE`, `AGENCY_SECONDARY_PHONE` and `AGENCY_EMAIL` for contact details and internal notifications. With SMTP unset, messages remain queued rather than being sent.

Availability uses the `Vehicle.availableUnits` count, confirmed quote quantities, overlapping manual blocks, and half-open date ranges (`pickupAt < requestedDropoff` and `returnAt > requestedPickup`). `DEPOSIT_PENDING` quotes are not counted by default; `rental-policy.availabilityCountDepositPending` can enable them. The default response hides exact inventory (`availabilityStockVisibility: "LEVEL"`); set it to `"EXACT"` for `remainingUnits`. `availabilityLowStockThreshold` controls the low-stock level (seed default: 2). Category stock starts at zero and must be set by an administrator; no vehicle counts or prices are invented. The optional `pickupLocationId` and `returnLocationId` let availability checks return the short-rental location and operating-hours warnings.
