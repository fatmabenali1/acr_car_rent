import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../db";
import { processPendingEmails } from "../services/quote-email-outbox";
import { verifyRecaptchaToken } from "../services/recaptcha";

const contactRouter = Router();

const contactRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  phone: z.string().trim().min(5).max(30),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(4_000),
  language: z.enum(["en", "el"]).default("en"),
  recaptchaToken: z.string().min(1).max(4_000),
}).strict();

contactRouter.post("/contact", async (request, response) => {
  const input = contactRequestSchema.parse(request.body);
  const language = z.enum(["en", "el"]).optional().parse(request.query.lang) ?? input.language;

  await verifyRecaptchaToken(input.recaptchaToken, "contact");

  const payload = {
    name: input.name,
    email: input.email,
    phone: input.phone,
    subject: input.subject,
    message: input.message,
  };
  await prisma.contactMessage.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      subject: input.subject,
      message: input.message,
      language,
      emailNotifications: {
        create: [
          {
            recipient: input.email,
            template: "contact_acknowledgement",
            language,
            payload,
          },
          {
            recipient: env.AGENCY_EMAIL,
            template: "internal_contact_notification",
            language,
            payload,
          },
        ],
      },
    },
  });

  void processPendingEmails(2);
  response.status(202).json({
    success: true,
    data: {
      notificationStatus: "queued",
      message: language === "el"
        ? "Λάβαμε το μήνυμά σας. Η ομάδα μας θα επικοινωνήσει μαζί σας."
        : "We received your message. Our team will get back to you.",
    },
    meta: { lang: language },
  });
});

export { contactRouter };
