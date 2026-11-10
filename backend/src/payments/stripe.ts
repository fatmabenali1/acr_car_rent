import Stripe from "stripe";
import { env } from "../config/env";
import { AppError } from "../middleware/errors";
import type {
  CreatePaymentInput,
  CreatedPayment,
  PaymentProvider,
  PaymentStatus,
  PaymentWebhookEvent,
} from "./provider";

export class StripePaymentProvider implements PaymentProvider {
  private stripeClient?: Stripe;

  private stripe(): Stripe {
    if (!env.STRIPE_SECRET_KEY) {
      throw new AppError(503, "STRIPE_NOT_CONFIGURED", "Online payments are not configured");
    }
    const apiUrl = env.NODE_ENV === "test" && env.STRIPE_API_BASE_URL
      ? new URL(env.STRIPE_API_BASE_URL)
      : undefined;
    this.stripeClient ??= new Stripe(env.STRIPE_SECRET_KEY, apiUrl ? {
      host: apiUrl.hostname,
      port: Number(apiUrl.port) || (apiUrl.protocol === "http:" ? 80 : 443),
      protocol: apiUrl.protocol === "http:" ? "http" : "https",
    } : undefined);
    return this.stripeClient;
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const session = await this.stripe().checkout.sessions.create({
      mode: "payment",
      allowed_payment_method_types: ["card"],
      customer_email: input.email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: input.currency,
          unit_amount: input.amountCents,
          product_data: { name: `Deposit - ${input.reference}` },
        },
      }],
      metadata: { booking_id: input.bookingId, reference: input.reference },
      payment_intent_data: {
        metadata: { booking_id: input.bookingId, reference: input.reference },
      },
      success_url: `${env.APP_URL.replace(/\/$/, "")}/pay/success?ref=${encodeURIComponent(input.reference)}`,
      cancel_url: `${env.APP_URL.replace(/\/$/, "")}/pay/cancel?ref=${encodeURIComponent(input.reference)}`,
      expires_at: Math.floor(expiresAt.getTime() / 1000),
    }, { idempotencyKey: input.idempotencyKey });

    if (!session.url) {
      throw new AppError(502, "STRIPE_CHECKOUT_URL_MISSING", "Stripe did not return a checkout URL");
    }

    return {
      sessionId: session.id,
      paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
      url: session.url,
      expiresAt,
    };
  }

  async getStatus(sessionId: string): Promise<PaymentStatus> {
    const session = await this.stripe().checkout.sessions.retrieve(sessionId);
    if (session.status === "expired") return "expired";
    if (session.payment_status === "paid") return "paid";
    return "pending";
  }

  handleWebhook(rawBody: Buffer, signature: string): PaymentWebhookEvent {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new AppError(503, "STRIPE_WEBHOOK_NOT_CONFIGURED", "Payment notifications are not configured");
    }

    let event: Stripe.Event;
    try {
      event = this.stripe().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw new AppError(400, "INVALID_STRIPE_SIGNATURE", "Payment notification signature is invalid");
    }

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        id: event.id,
        type: event.type,
        sessionId: session.id,
        paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
        bookingId: session.metadata?.booking_id ?? null,
        reference: session.metadata?.reference ?? null,
        paid: event.type === "checkout.session.completed" && session.payment_status === "paid",
      };
    }

    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      return {
        id: event.id,
        type: event.type,
        sessionId: null,
        paymentIntentId: intent.id,
        bookingId: intent.metadata.booking_id ?? null,
        reference: intent.metadata.reference ?? null,
        paid: false,
      };
    }

    return {
      id: event.id,
      type: event.type,
      sessionId: null,
      paymentIntentId: null,
      bookingId: null,
      reference: null,
      paid: false,
    };
  }
}
