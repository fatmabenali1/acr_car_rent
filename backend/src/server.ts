import { app } from "./app";
import {
  env,
  smtpConfigured,
  stripePaymentMissingVariables,
  stripePaymentsEnabled,
  stripePaymentMode,
} from "./config/env";
import { prisma } from "./db";
import { startEmailOutboxWorker, stopEmailOutboxWorker } from "./services/quote-email-outbox";

const server = app.listen(env.PORT, () => {
  console.info(`ACR API listening on port ${env.PORT}`);
  if (!env.PRICING_CONFIRMED) {
    console.warn("TEMPORARY PLACEHOLDER PRICES are active; replace them with approved rates before launch.");
  }
  if (!smtpConfigured) {
    console.warn("SMTP is not configured; reservation emails will not be delivered.");
  }
  if (stripePaymentsEnabled) {
    console.info(`Payments: ENABLED (${stripePaymentMode} mode)`);
  } else {
    console.info(`Payments: DISABLED, missing: ${stripePaymentMissingVariables.join(", ")}`);
  }
  startEmailOutboxWorker();
});

const shutdown = async (signal: string): Promise<void> => {
  console.info(`${signal} received; shutting down`);
  server.close(async (error) => {
    if (error) {
      console.error("HTTP server shutdown failed", error);
      process.exitCode = 1;
    }
    await stopEmailOutboxWorker();
    await prisma.$disconnect();
  });
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
