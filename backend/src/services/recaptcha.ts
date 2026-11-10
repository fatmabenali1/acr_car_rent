import { z } from "zod";
import { env, recaptchaHostnames } from "../config/env";
import { AppError } from "../middleware/errors";

const verificationSchema = z.object({
  success: z.boolean(),
  score: z.number().optional(),
  action: z.string().optional(),
  hostname: z.string().optional(),
});

export async function verifyRecaptchaToken(token: string, expectedAction: string): Promise<void> {
  if (!env.RECAPTCHA_SECRET_KEY || env.RECAPTCHA_SECRET_KEY === "replace-me") {
    throw new AppError(503, "RECAPTCHA_NOT_CONFIGURED", "Public form verification is not configured");
  }

  let response: Response;
  try {
    const verificationUrl = env.NODE_ENV === "test" && env.RECAPTCHA_TEST_VERIFY_URL
      ? env.RECAPTCHA_TEST_VERIFY_URL
      : "https://www.google.com/recaptcha/api/siteverify";
    response = await fetch(verificationUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: env.RECAPTCHA_SECRET_KEY, response: token }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.error("reCAPTCHA verification request failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
    } else {
      console.error("reCAPTCHA verification request failed", error);
    }
    throw new AppError(503, "RECAPTCHA_UNAVAILABLE", "Form verification is temporarily unavailable");
  }

  if (!response.ok) {
    throw new AppError(503, "RECAPTCHA_UNAVAILABLE", "Form verification is temporarily unavailable");
  }

  let result: z.infer<typeof verificationSchema>;
  try {
    result = verificationSchema.parse(await response.json());
  } catch {
    throw new AppError(503, "RECAPTCHA_UNAVAILABLE", "Form verification returned an invalid response");
  }

  if (!result.success || !result.score || result.score < env.RECAPTCHA_MIN_SCORE) {
    throw new AppError(400, "RECAPTCHA_REJECTED", "Form verification failed");
  }
  if (result.action !== expectedAction) {
    throw new AppError(400, "RECAPTCHA_REJECTED", "Form verification failed");
  }
  if (
    recaptchaHostnames.length > 0 &&
    (!result.hostname || !recaptchaHostnames.includes(result.hostname.toLowerCase()))
  ) {
    throw new AppError(400, "RECAPTCHA_REJECTED", "Form verification failed");
  }
}
