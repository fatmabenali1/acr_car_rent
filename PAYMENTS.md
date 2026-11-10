# Secure payments

The site uses the existing PostgreSQL/Prisma database and Stripe Checkout. Card details are entered on Stripe and never sent to this application. The agency must first create and price a quote; the server reads the deposit amount from that quote and never accepts an amount from the browser.

## Local setup

1. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`, the JWT secrets, `APP_URL=http://localhost:5173`, and Stripe **test-mode** credentials:

   ```text
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

2. Configure SMTP to send confirmation emails. `SMTP_PASS` and `MAIL_FROM` are accepted aliases for `SMTP_PASSWORD` and `SMTP_FROM`. Set `MAIL_AGENCY_TO` to the agency notification address (default: `info@athenscarrental.com`). In development without SMTP, email delivery is simulated and no email is sent externally.
3. Generate and migrate the Prisma client/schema:

   ```powershell
   cd backend
   npm run db:generate
   npx prisma migrate deploy
   npm run db:seed
   ```

4. Start both applications from the repository root:

   ```powershell
   npm run dev
   ```

   The frontend uses port `5173`; the API uses port `4000`.
5. In another terminal, forward Stripe test events:

   ```powershell
   stripe listen --forward-to localhost:4000/api/payments/webhook
   ```

   Copy the CLI `whsec_...` value into `STRIPE_WEBHOOK_SECRET` and restart the backend.

Use Stripe test card `4242 4242 4242 4242` with any future expiry and CVC for a successful payment. Use `4000 0000 0000 9995` to test a declined payment.

## Flow and API

- Submit a quote request to create a reference. Agency staff set the total and deposit; the deposit must be at least EUR 50 and cannot exceed the total.
- Open `/pay?ref=<reference>` (or use Secure payment in the navigation), then verify the reservation with its email address.
- Checkout creates a 30-minute Stripe-hosted session. Only a signed webhook can mark a reservation paid. The success page reads status from the database while the webhook is processed.
- The webhook records each Stripe event once. Paid events queue customer and agency email notifications in the existing retryable email outbox. The customer confirmation is in English and includes payment details plus ACR phone and email contacts.
- Location suggestions come from `GET /api/locations`; the API exposes only Athens International Airport “Eleftherios Venizelos”, Koropi Metro Station, and Piraeus Port. Custom addresses are stored as unconfirmed addresses, with no delivery fee inferred.

## Production

- Set `APP_URL` to the canonical HTTPS site origin. CORS accepts only this origin.
- Replace test credentials with Stripe live-mode `sk_live_...` credentials and configure the production webhook signing secret. Never put either secret in frontend variables.
- Register `https://<your-domain>/api/payments/webhook` in Stripe and subscribe to `checkout.session.completed`, `checkout.session.expired`, and `payment_intent.payment_failed`.
- Serve the frontend and API over HTTPS, protect `.env`, and configure production SMTP. Verify Stripe live mode and real webhook delivery before accepting payments.
