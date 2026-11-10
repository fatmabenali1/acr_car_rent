# E2E testing

The Playwright suite uses dedicated local services and the isolated PostgreSQL database `acr_rent_car_e2e`. It never uses the development API/frontend ports or a real SMTP server. Stripe calls use a local fake by default.

## Setup

1. Install root and app dependencies:

   ```powershell
   npm install
   npm --prefix backend install
   npm --prefix frontend/mon-projet-react install
   npx playwright install chromium
   ```

2. Copy `backend/.env.test.example` to `backend/.env.test` and set `DATABASE_URL` to your local PostgreSQL credentials, keeping the database name exactly `acr_rent_car_e2e`. The suite refuses to start if the URL is the same as `backend/.env` or does not end in `_e2e`. `.env.test` is ignored by Git.

3. Ensure local PostgreSQL is running and the configured role can create databases. The npm runner creates only `acr_rent_car_e2e`, runs `prisma migrate deploy` against that URL, and seeds minimal reference data before starting any backend process. It never uses `migrate dev` or `migrate reset`.

The suite starts a fake Stripe API and reCAPTCHA endpoint on `localhost:12111`, an unauthenticated fake SMTP server on `localhost:1025`, dedicated backend processes on ports `4100`–`4105`, and Vite on port `5183`. Ports `4101` and `4102` isolate the no-key and rate-limit cases; `4103` isolates webhook tests; `4104` is reserved for the optional real Stripe test-mode session check; `4105` isolates payment API tests from browser traffic and rate limits. It rejects non-local Stripe, SMTP, and reCAPTCHA test endpoints. Browser E2E requests use `VITE_API_URL=http://localhost:4100/api/v1`.

The fake SMTP inbox is held in memory. PostgreSQL outbox rows are inspected independently; data tables are truncated with `RESTART IDENTITY CASCADE` between API suites while seeded reference rows are preserved.

## Commands

```powershell
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:e2e:report
```

The HTML report is written to `playwright-report`. Open it with `npx playwright show-report` (or use `npm run test:e2e:report`).

## Environment

`backend/.env.test.example` documents the variables. The DB URL must point to a database ending in `_e2e`; `SMTP_HOST`/`SMTP_PORT` are fixed to `localhost:1025`; Stripe and reCAPTCHA verification are redirected to the local fake service only while `NODE_ENV=test`. Keys in the example are fake test-only placeholders.

The suite does not enable a real Stripe smoke test or visit Stripe-hosted checkout pages. It tests session creation against the local Stripe-compatible fake API and signs webhook events with a fake test webhook secret.

### Optional Stripe test-mode smoke test

This is skipped by default. To opt in, put a restricted Stripe test secret in the ignored `backend/.env.test`, run the Stripe CLI listener in another terminal, copy its printed webhook signing secret to `STRIPE_WEBHOOK_SECRET`, and set `STRIPE_WEBHOOK_LOCAL=1` in that same ignored file:

Terminal 1:

```powershell
stripe listen --forward-to localhost:4104/api/payments/webhook
```

Terminal 2, after setting `STRIPE_WEBHOOK_SECRET` and `STRIPE_WEBHOOK_LOCAL=1` in `backend/.env.test`:

```powershell
npm run test:e2e -- --grep "optional real Stripe"
```

Port `4104` bypasses the fake Stripe API only for this opt-in session-creation test. It checks that Stripe returns a hosted test URL and never opens or submits the hosted page. For a manual Stripe test checkout, use card `4242 4242 4242 4242` with any future expiry date, any CVC, and any postal code. Never use a live secret or real card.
