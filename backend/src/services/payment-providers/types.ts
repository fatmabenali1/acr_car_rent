export type PaymentOutcome = "PAID" | "FAILED" | "CANCELLED";

export type CreatePaymentSessionInput = {
  paymentId: string;
  reference: string;
  amountEur: string;
  currency: "EUR";
  customerEmail: string;
};

export type PaymentSession = {
  transactionId: string;
  redirectUrl: string;
  redirectParameters: Record<string, string>;
};

export type VerifiedPaymentCallback = {
  transactionId: string;
  outcome: PaymentOutcome;
  safeResponse: Record<string, string>;
};

export type RefundResult = {
  transactionId: string;
  status: "REFUNDED";
};

export interface PaymentProvider {
  createSession(input: CreatePaymentSessionInput): Promise<PaymentSession>;
  verifyCallback(payload: unknown): Promise<VerifiedPaymentCallback>;
  refund(transactionId: string, amountEur: string): Promise<RefundResult>;
}
