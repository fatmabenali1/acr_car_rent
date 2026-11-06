import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env";
import { AppError } from "../../middleware/errors";
import type {
  CreatePaymentSessionInput,
  PaymentOutcome,
  PaymentProvider,
  PaymentSession,
  RefundResult,
  VerifiedPaymentCallback,
} from "./types";

const MOCK_CALLBACK_SECRET = "acr-development-mock-provider-only";

type MockCallback = {
  transactionId: string;
  outcome: PaymentOutcome;
  signature: string;
};

export class MockProvider implements PaymentProvider {
  async createSession(input: CreatePaymentSessionInput): Promise<PaymentSession> {
    const transactionId = `mock_${randomUUID()}`;
    return {
      transactionId,
      redirectUrl: `/api/v1/payments/mock-checkout/${encodeURIComponent(input.paymentId)}`,
      redirectParameters: {
        paymentId: input.paymentId,
        transactionId,
        reference: input.reference,
        amount: input.amountEur,
        currency: input.currency,
        email: input.customerEmail,
        outcomes: "success,failure,cancelled",
      },
    };
  }

  async verifyCallback(payload: unknown): Promise<VerifiedPaymentCallback> {
    if (!isMockCallback(payload)) {
      throw new AppError(400, "INVALID_PAYMENT_CALLBACK", "Payment callback is invalid");
    }

    const expected = signMockCallback(payload.transactionId, payload.outcome);
    const receivedBuffer = Buffer.from(payload.signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      throw new AppError(400, "INVALID_PAYMENT_SIGNATURE", "Payment callback signature is invalid");
    }

    return {
      transactionId: payload.transactionId,
      outcome: payload.outcome,
      safeResponse: {
        transactionId: payload.transactionId,
        outcome: payload.outcome,
      },
    };
  }

  async refund(transactionId: string, _amountEur: string): Promise<RefundResult> {
    if (!transactionId.startsWith("mock_")) {
      throw new AppError(400, "PAYMENT_PROVIDER_TRANSACTION_NOT_FOUND", "Mock transaction not found");
    }
    return { transactionId: `mock_refund_${randomUUID()}`, status: "REFUNDED" };
  }

  createCallback(transactionId: string, outcome: PaymentOutcome): MockCallback {
    return {
      transactionId,
      outcome,
      signature: signMockCallback(transactionId, outcome),
    };
  }
}

function signMockCallback(transactionId: string, outcome: PaymentOutcome): string {
  return createHmac("sha256", MOCK_CALLBACK_SECRET)
    .update(`${transactionId}:${outcome}`)
    .digest("hex");
}

function isMockCallback(value: unknown): value is MockCallback {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const callback = value as Record<string, unknown>;
  return (
    typeof callback.transactionId === "string" &&
    callback.transactionId.startsWith("mock_") &&
    (callback.outcome === "PAID" || callback.outcome === "FAILED" || callback.outcome === "CANCELLED") &&
    typeof callback.signature === "string"
  );
}

export function mockCheckoutAvailable(): boolean {
  return env.NODE_ENV !== "production" && env.PAYMENT_PROVIDER === "mock";
}
