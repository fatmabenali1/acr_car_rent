import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../db";
import { processPendingEmails } from "../services/quote-email-outbox";

const inquiriesRouter = Router();
const inquiryRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

const inquirySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  phone: z.string().trim().min(5).max(30),
  van: z.enum([
    "Category V Manual - Small Van",
    "Category V1 Manual - Large Van",
    "Not sure yet",
  ]),
  pickupLocation: z.string().trim().min(1).max(300),
  pickupAt: z.string().datetime({ offset: true }),
  returnAt: z.string().datetime({ offset: true }),
  message: z.string().trim().max(600).optional().default(""),
  privacyAccepted: z.literal(true),
  website: z.string().max(500).optional().default(""),
}).strict().superRefine((inquiry, context) => {
  if (new Date(inquiry.returnAt) <= new Date(inquiry.pickupAt)) {
    context.addIssue({
      code: "custom",
      path: ["returnAt"],
      message: "Return date and time must be after pick-up",
    });
  }
});

inquiriesRouter.post("/inquiries", inquiryRateLimit, async (request, response) => {
  const input = inquirySchema.parse(request.body);

  if (input.website.trim()) {
    response.status(202).json({ success: true, data: { notificationStatus: "queued" } });
    return;
  }

  const subject = `Cargo van quote request - ${input.van}`;
  const message = [
    `Van: ${input.van}`,
    `Pick-up location: ${input.pickupLocation}`,
    `Pick-up: ${new Date(input.pickupAt).toLocaleString("en-GB", { timeZone: "Europe/Athens" })}`,
    `Return: ${new Date(input.returnAt).toLocaleString("en-GB", { timeZone: "Europe/Athens" })}`,
    `Personal data processing accepted: ${input.privacyAccepted ? "Yes" : "No"}`,
    "",
    "Additional message:",
    input.message || "—",
  ].join("\n");
  const emailPayload = {
    name: input.name,
    email: input.email,
    phone: input.phone,
    subject,
    message,
  };

  await prisma.contactMessage.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      subject,
      message,
      language: "en",
      emailNotifications: {
        create: [
          {
            recipient: input.email,
            template: "contact_acknowledgement",
            language: "en",
            payload: emailPayload,
          },
          {
            recipient: env.MAIL_TO_AGENCY ?? env.AGENCY_EMAIL,
            template: "internal_contact_notification",
            language: "en",
            payload: emailPayload,
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
      message: "Thank you, we reply within 24 hours",
    },
  });
});

export { inquiriesRouter };
