import { StripePaymentProvider } from "./stripe";

export type PaymentStatus = "pending" | "paid" | "failed" | "expired";

export type CreatePaymentInput = {
  bookingId: string;
  reference: string;
  amountCents: number;
  currency: "eur";
  email: string;
  idempotencyKey: string;
};

export type CreatedPayment = {
  sessionId: string;
  paymentIntentId: string | null;
  url: string;
  expiresAt: Date;
};

export type PaymentWebhookEvent = {
  id: string;
  type: string;
  sessionId: string | null;
  paymentIntentId: string | null;
  bookingId: string | null;
  reference: string | null;
  paid: boolean;
};

export interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatedPayment>;
  getStatus(sessionId: string): Promise<PaymentStatus>;
  handleWebhook(rawBody: Buffer, signature: string): PaymentWebhookEvent;
}

export function getPaymentProvider(): PaymentProvider {
  return new StripePaymentProvider();
}
