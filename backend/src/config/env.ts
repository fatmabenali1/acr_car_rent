import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url(),
  APP_URL: z.string().url().default("http://localhost:5173"),
  FRONTEND_URL: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().url().optional(),
  ),
  PRICING_CONFIRMED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ADMIN_EMAIL: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().email().optional(),
  ),
  ADMIN_PASSWORD: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().min(12).optional(),
  ),
  ADMIN_UPLOAD_DIR: z.string().default("uploads"),
  ADMIN_UPLOAD_MAX_BYTES: z.coerce.number().int().min(1_024).max(10_485_760).default(5_242_880),
  RECAPTCHA_SECRET_KEY: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().optional(),
  ),
  RECAPTCHA_TEST_VERIFY_URL: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().url().optional(),
  ),
  RECAPTCHA_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.5),
  RECAPTCHA_EXPECTED_HOSTNAMES: z.string().default(""),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.preprocess(
    (value) => typeof value === "string" && value.length > 0 ? value : process.env.SMTP_PASS,
    z.string().optional(),
  ),
  SMTP_FROM: z.preprocess(
    (value) => {
      const configured = typeof value === "string" && value.length > 0 ? value : process.env.MAIL_FROM;
      return configured === "" ? undefined : configured;
    },
    z.string().email().optional(),
  ),
  AGENCY_EMAIL: z.string().email().default("info@athenscarrental.com"),
  MAIL_TO_AGENCY: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().email().optional(),
  ),
  MAIL_AGENCY_TO: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().email().optional(),
  ),
  AGENCY_PHONE: z.string().default("+30 210 6022220"),
  AGENCY_SECONDARY_PHONE: z.string().default("+30 210 6624887"),
  PAYMENT_PORTAL_URL: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().url().optional(),
  ),
  PAYMENT_PROVIDER: z.enum(["mock", "alphabank"]).default("mock"),
  ALPHABANK_INTEGRATION_CONFIG: z.string().optional(),
  PAYMENT_PORTAL_POSTAL_CODE: z.string().default("19400"),
  STRIPE_SECRET_KEY: z.preprocess((value) => value === "" ? undefined : value, z.string().optional()),
  STRIPE_WEBHOOK_SECRET: z.preprocess((value) => value === "" ? undefined : value, z.string().optional()),
  STRIPE_PUBLISHABLE_KEY: z.preprocess((value) => value === "" ? undefined : value, z.string().optional()),
  STRIPE_API_BASE_URL: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().url().optional(),
  ),
}).superRefine((config, context) => {
  if (config.NODE_ENV === "production" && config.PAYMENT_PROVIDER === "mock") {
    context.addIssue({
      code: "custom",
      path: ["PAYMENT_PROVIDER"],
      message: "The mock payment provider is development-only",
    });
  }
  if (config.NODE_ENV === "production" && new URL(config.APP_URL).protocol !== "https:") {
    context.addIssue({
      code: "custom",
      path: ["APP_URL"],
      message: "APP_URL must use HTTPS in production",
    });
  }
  if (Boolean(config.ADMIN_EMAIL) !== Boolean(config.ADMIN_PASSWORD)) {
    context.addIssue({
      code: "custom",
      path: ["ADMIN_EMAIL"],
      message: "ADMIN_EMAIL and ADMIN_PASSWORD must be configured together",
    });
  }
  if (
    config.PAYMENT_PORTAL_URL &&
    !["http:", "https:"].includes(new URL(config.PAYMENT_PORTAL_URL).protocol)
  ) {
    context.addIssue({
      code: "custom",
      path: ["PAYMENT_PORTAL_URL"],
      message: "PAYMENT_PORTAL_URL must use HTTP or HTTPS",
    });
  }
  const unauthenticatedTestSmtp = config.NODE_ENV === "test"
    && config.SMTP_HOST === "localhost"
    && !config.SMTP_USER
    && !config.SMTP_PASSWORD;
  const smtpValues = [config.SMTP_HOST, config.SMTP_USER, config.SMTP_PASSWORD, config.SMTP_FROM];
  if (
    smtpValues.some(Boolean) &&
    smtpValues.some((value) => !value) &&
    !unauthenticatedTestSmtp
  ) {
    context.addIssue({
      code: "custom",
      path: ["SMTP_HOST"],
      message: "SMTP_HOST, SMTP_USER, SMTP_PASSWORD and SMTP_FROM must be configured together",
    });
  }
});

export const env = envSchema.parse(process.env);
export const corsOrigins = [new URL(env.FRONTEND_URL ?? env.APP_URL).origin];
export const stripePaymentMissingVariables = [
  ...(!env.STRIPE_SECRET_KEY ? ["STRIPE_SECRET_KEY"] : []),
  ...(!env.STRIPE_WEBHOOK_SECRET ? ["STRIPE_WEBHOOK_SECRET"] : []),
];
export const stripePaymentsEnabled = stripePaymentMissingVariables.length === 0;
export const stripePaymentMode = env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ||
  env.STRIPE_SECRET_KEY?.startsWith("rk_test_")
  ? "test"
  : "live";
export const recaptchaHostnames = env.RECAPTCHA_EXPECTED_HOSTNAMES
  .split(",")
  .map((hostname) => hostname.trim().toLowerCase())
  .filter(Boolean);
export const smtpConfigured = Boolean(
  env.SMTP_HOST &&
  env.SMTP_FROM &&
  (
    (env.SMTP_USER && env.SMTP_PASSWORD) ||
    (env.NODE_ENV === "test" && env.SMTP_HOST === "localhost")
  ),
);
