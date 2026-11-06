import { AppError } from "../../middleware/errors";
import type {
  CreatePaymentSessionInput,
  PaymentProvider,
  PaymentSession,
  RefundResult,
  VerifiedPaymentCallback,
} from "./types";

export class AlphaBankProvider implements PaymentProvider {
  constructor(private readonly integrationConfig?: string) {}

  // TODO: Obtain Alpha Bank's official documentation before defining checkout fields or URLs.
  async createSession(_input: CreatePaymentSessionInput): Promise<PaymentSession> {
    this.requireOfficialIntegrationDetails();
    throw new AppError(501, "ALPHABANK_INTEGRATION_TODO", "Alpha Bank hosted checkout is not implemented");
  }

  // TODO: Implement the documented signature and callback-field verification; do not trust unsigned data.
  async verifyCallback(_payload: unknown): Promise<VerifiedPaymentCallback> {
    this.requireOfficialIntegrationDetails();
    throw new AppError(501, "ALPHABANK_INTEGRATION_TODO", "Alpha Bank callback verification is not implemented");
  }

  // TODO: Implement refunds only after Alpha Bank documents its refund contract.
  async refund(_transactionId: string, _amountEur: string): Promise<RefundResult> {
    this.requireOfficialIntegrationDetails();
    throw new AppError(501, "ALPHABANK_INTEGRATION_TODO", "Alpha Bank refunds are not implemented");
  }

  private requireOfficialIntegrationDetails(): void {
    if (!this.integrationConfig) {
      throw new AppError(
        503,
        "ALPHABANK_CONFIGURATION_REQUIRED",
        "Set ALPHABANK_INTEGRATION_CONFIG after obtaining Alpha Bank's official integration documentation",
      );
    }
  }
}
