import { env } from "../../config/env";
import { AppError } from "../../middleware/errors";
import { AlphaBankProvider } from "./alphabank-provider";
import { MockProvider } from "./mock-provider";
import type { PaymentProvider } from "./types";

export function getPaymentProvider(): PaymentProvider {
  switch (env.PAYMENT_PROVIDER) {
    case "mock":
      return new MockProvider();
    case "alphabank":
      return new AlphaBankProvider(env.ALPHABANK_INTEGRATION_CONFIG);
    default:
      throw new AppError(500, "PAYMENT_PROVIDER_INVALID", "Configured payment provider is unavailable");
  }
}

export type {
  PaymentOutcome,
  PaymentProvider,
  VerifiedPaymentCallback,
} from "./types";
