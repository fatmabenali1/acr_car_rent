import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import { Client } from "pg";
import { startFakeServices } from "./helpers/fake-services.mjs";
import { seedReferenceData } from "./helpers/seed.mjs";

const root = process.cwd();
const backendDir = resolve(root, "backend");

function assertLocalUrl(value, name) {
  const url = new URL(value);
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error(`${name} must point to localhost for isolated E2E tests.`);
  }
  return url;
}

async function ensureTestDatabase(databaseUrl) {
  const testUrl = new URL(databaseUrl);
  const databaseName = decodeURIComponent(testUrl.pathname.replace(/^\/+/, ""));
  if (!databaseName.endsWith("_e2e")) {
    throw new Error(`Refusing E2E setup: database name "${databaseName}" must end with "_e2e".`);
  }

  const devEnvPath = resolve(backendDir, ".env");
  const devEnv = dotenv.parse(await readFile(devEnvPath));
  if (!devEnv.DATABASE_URL) {
    throw new Error("backend/.env has no DATABASE_URL; cannot verify database isolation.");
  }
  if (new URL(devEnv.DATABASE_URL).href === testUrl.href) {
    throw new Error("Refusing E2E setup: backend/.env.test DATABASE_URL is identical to backend/.env.");
  }

  const maintenanceUrl = new URL(testUrl);
  maintenanceUrl.pathname = "/postgres";
  maintenanceUrl.searchParams.delete("schema");
  const client = new Client({
    connectionString: maintenanceUrl.href,
    connectionTimeoutMillis: 5_000,
    application_name: "acr-rent-car-e2e-bootstrap",
  });
  try {
    await client.connect();
    const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [databaseName]);
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${databaseName}"`);
    }
  } catch (error) {
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      throw new Error(
        "Local PostgreSQL is unreachable. Start the PostgreSQL Windows service (Services → postgresql-x64-17 or postgresql-x64-18), then rerun npm run test:e2e.",
        { cause: error },
      );
    }
    throw new Error(`Could not create the isolated ${databaseName} database: ${error.message}`, { cause: error });
  } finally {
    await client.end().catch(() => {});
  }
}

function runPrismaMigrations(env) {
  const result = spawnSync("npm", ["exec", "--", "prisma", "migrate", "deploy"], {
    cwd: backendDir,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `prisma migrate deploy failed for the isolated E2E database${result.error ? `: ${result.error.message}` : ` (exit ${result.status})`}.`,
      { cause: result.error },
    );
  }
}

export async function prepareE2EDatabase() {
  const testEnvPath = resolve(backendDir, ".env.test");
  let testEnv;
  try {
    testEnv = dotenv.parse(await readFile(testEnvPath));
  } catch {
    throw new Error("Missing backend/.env.test. Copy backend/.env.test.example and set local PostgreSQL credentials.");
  }
  Object.assign(process.env, testEnv);

  const testUrl = assertLocalUrl(testEnv.DATABASE_URL, "DATABASE_URL");
  if (!decodeURIComponent(testUrl.pathname.replace(/^\/+/, "")).endsWith("_e2e")) {
    throw new Error("Refusing E2E setup: backend/.env.test DATABASE_URL database name must end with _e2e.");
  }
  if (testEnv.SMTP_HOST !== "localhost" || testEnv.SMTP_PORT !== "1025") {
    throw new Error("Refusing E2E setup: SMTP_HOST/SMTP_PORT must be localhost/1025; real SMTP is forbidden.");
  }
  assertLocalUrl(testEnv.STRIPE_API_BASE_URL, "STRIPE_API_BASE_URL");
  assertLocalUrl(testEnv.RECAPTCHA_TEST_VERIFY_URL, "RECAPTCHA_TEST_VERIFY_URL");

  await ensureTestDatabase(testEnv.DATABASE_URL);
  const backendTestEnv = {
    ...process.env,
    ...testEnv,
    NODE_ENV: "test",
    PORT: "4100",
    APP_URL: "http://localhost:5183",
    FRONTEND_URL: "http://localhost:5183",
  };
  runPrismaMigrations(backendTestEnv);
  await seedReferenceData(backendTestEnv.DATABASE_URL);
  return backendTestEnv;
}

export default async function globalSetup() {
  const backendTestEnv = await prepareE2EDatabase();
  Object.assign(process.env, backendTestEnv);
  globalThis.__acrRentCarE2EServices = await startFakeServices();
}
