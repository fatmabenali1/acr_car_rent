import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { Client } from "pg";
import { prepareE2EDatabase } from "./global-setup.mjs";

const root = process.cwd();
const backendTestEnv = await prepareE2EDatabase();
const cleanupClient = new Client({
  connectionString: backendTestEnv.DATABASE_URL,
  connectionTimeoutMillis: 5_000,
  application_name: "acr-rent-car-e2e-cleanup",
});
try {
  await cleanupClient.connect();
  await cleanupClient.query(
    'TRUNCATE TABLE "EmailOutbox", "QuoteExtra", "QuoteVehicle", "Payment", "ProcessedStripeEvent", "Quote", "ContactMessage", "CookieConsent" RESTART IDENTITY CASCADE',
  );
} finally {
  await cleanupClient.end();
}
const playwrightCli = resolve(root, "node_modules/@playwright/test/cli.js");
const result = spawnSync(
  process.execPath,
  [playwrightCli, "test", ...process.argv.slice(2)],
  {
    cwd: root,
    env: { ...process.env, ...backendTestEnv },
    stdio: "inherit",
  },
);

if (result.error) {
  throw new Error(`Could not start Playwright: ${result.error.message}`, { cause: result.error });
}
process.exitCode = result.status ?? 1;
