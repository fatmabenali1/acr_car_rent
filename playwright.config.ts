import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

const root = process.cwd();
const backendDir = resolve(root, "backend");
const testEnvPath = resolve(backendDir, ".env.test");
const loaded = dotenv.config({ path: testEnvPath });

if (loaded.error) {
  throw new Error(
    "Missing backend/.env.test. Copy backend/.env.test.example to backend/.env.test, set local PostgreSQL credentials, then rerun the E2E suite.",
  );
}

const testEnv = loaded.parsed ?? {};
const backendEnv = {
  ...process.env,
  ...testEnv,
  NODE_ENV: "test",
  PORT: "4100",
  FRONTEND_URL: "http://localhost:5183",
  APP_URL: "http://localhost:5183",
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
  SMTP_SECURE: "false",
  STRIPE_API_BASE_URL: "http://localhost:12111",
  RECAPTCHA_TEST_VERIFY_URL: "http://localhost:12111/recaptcha/verify",
};

Object.assign(process.env, backendEnv);

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.mjs",
  globalTeardown: "./tests/e2e/global-teardown.mjs",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL: "http://localhost:5183",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: [
    {
      command: "npm run dev",
      cwd: backendDir,
      url: "http://localhost:4100/api/docs/",
      reuseExistingServer: false,
      timeout: 120_000,
      env: backendEnv,
    },
    {
      command: "npm run dev",
      cwd: backendDir,
      url: "http://localhost:4101/api/docs/",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...backendEnv,
        PORT: "4101",
        STRIPE_SECRET_KEY: "",
        STRIPE_WEBHOOK_SECRET: "",
        SMTP_HOST: "",
        SMTP_FROM: "",
        SMTP_USER: "",
        SMTP_PASSWORD: "",
        SMTP_PASS: "",
        MAIL_FROM: "",
      },
    },
    {
      command: "npm run dev",
      cwd: backendDir,
      url: "http://localhost:4102/api/docs/",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...backendEnv,
        PORT: "4102",
        SMTP_HOST: "",
        SMTP_FROM: "",
        SMTP_USER: "",
        SMTP_PASSWORD: "",
        SMTP_PASS: "",
        MAIL_FROM: "",
      },
    },
    {
      command: "npm run dev",
      cwd: backendDir,
      url: "http://localhost:4104/api/docs/",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...backendEnv,
        PORT: "4104",
        STRIPE_API_BASE_URL: "",
        SMTP_HOST: "",
        SMTP_FROM: "",
        SMTP_USER: "",
        SMTP_PASSWORD: "",
        SMTP_PASS: "",
        MAIL_FROM: "",
      },
    },
    {
      command: "npm run dev",
      cwd: backendDir,
      url: "http://localhost:4105/api/docs/",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...backendEnv,
        PORT: "4105",
        SMTP_HOST: "",
        SMTP_FROM: "",
        SMTP_USER: "",
        SMTP_PASSWORD: "",
        SMTP_PASS: "",
        MAIL_FROM: "",
      },
    },
    {
      command: "npm run dev -- --host localhost --port 5183 --strictPort",
      cwd: resolve(root, "frontend/mon-projet-react"),
      url: "http://localhost:5183",
      reuseExistingServer: false,
      timeout: 120_000,
      env: { ...process.env, VITE_API_URL: "http://localhost:4100/api/v1" },
    },
  ],
});
