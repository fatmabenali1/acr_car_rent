import { EmailDeliveryStatus } from "@prisma/client";
import nodemailer, { type Transporter } from "nodemailer";
import { z } from "zod";
import { env, smtpConfigured } from "../config/env";
import { prisma } from "../db";
import { renderDepositConfirmation, type DepositConfirmationPayload } from "./email-templates/deposit-confirmation";
import { renderInternalDepositPaid, type InternalDepositPaidPayload } from "./email-templates/internal-deposit-paid";
import { renderQuoteOffer, type QuoteOfferPayload } from "./email-templates/quote-offer";

const MAX_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 5_000;

const quoteEmailPayloadSchema = z.object({
  reference: z.string().regex(/^\d{4}[A-Z]{2}$/),
  customerFirstName: z.string(),
  customerLastName: z.string(),
  customerEmail: z.string().email(),
  customerPhone: z.string(),
  customerCountry: z.string(),
  vehicleCode: z.string(),
  pickupLocation: z.string(),
  returnLocation: z.string(),
  pickupAt: z.string().datetime(),
  returnAt: z.string().datetime(),
  flightNumber: z.string().nullable(),
  driverAge: z.number().int(),
  driverLicenceYears: z.number().int(),
  driverCountryCode: z.string(),
  driverHasInternationalPermit: z.boolean(),
  additionalDrivers: z.array(z.object({
    age: z.number().int(),
    licenceYears: z.number().int(),
    countryCode: z.string(),
    hasInternationalPermit: z.boolean(),
  })),
  extras: z.array(z.object({
    name: z.string(),
    quantity: z.number().int(),
    childAge: z.number().int().nullable(),
    childWeightKg: z.number().nullable(),
  })),
  notes: z.string().nullable(),
});

type QuoteEmailPayload = z.infer<typeof quoteEmailPayloadSchema>;
const contactEmailPayloadSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  subject: z.string(),
  message: z.string(),
});
type ContactEmailPayload = z.infer<typeof contactEmailPayloadSchema>;
type Language = "en" | "el";
type QuoteEmailTemplate = "quote_acknowledgement" | "internal_quote_notification";
type ContactEmailTemplate = "contact_acknowledgement" | "internal_contact_notification";
type EmailTemplate = QuoteEmailTemplate | ContactEmailTemplate | "quote_offer" | "deposit_confirmation" | "internal_deposit_paid";
const quoteOfferPayloadSchema: z.ZodType<QuoteOfferPayload> = z.object({
  reference: z.string().regex(/^\d{4}[A-Z]{2}$/),
  customerFirstName: z.string(),
  vehicleCategories: z.array(z.object({
    code: z.string(),
    exampleModels: z.array(z.string()),
    cdwExcessEur: z.string().nullable(),
    cancellationNoticeDays: z.number().int().nullable(),
  })),
  pickupAt: z.string().datetime(),
  returnAt: z.string().datetime(),
  pickupLocation: z.string(),
  returnLocation: z.string(),
  totalEur: z.string(),
  depositEur: z.string(),
  kilometresIncluded: z.string(),
  inclusions: z.array(z.string()),
  extras: z.array(z.string()),
  paymentUrl: z.string().url(),
  agencyPhones: z.array(z.string()),
});
const depositConfirmationPayloadSchema: z.ZodType<DepositConfirmationPayload> = z.object({
  reference: z.string().regex(/^\d{4}[A-Z]{2}$/),
  customerFirstName: z.string(),
  amountPaidEur: z.string(),
  totalPaidEur: z.string(),
  balanceRemainingEur: z.string(),
  pickupAt: z.string().datetime(),
  pickupLocation: z.string(),
  agencyPhones: z.array(z.string()),
});
const internalDepositPaidPayloadSchema: z.ZodType<InternalDepositPaidPayload> = z.object({
  reference: z.string().regex(/^\d{4}[A-Z]{2}$/),
  customerName: z.string(),
  customerEmail: z.string().email(),
  amountPaidEur: z.string(),
  totalPaidEur: z.string(),
  balanceRemainingEur: z.string(),
  pickupAt: z.string().datetime(),
});

let timer: NodeJS.Timeout | undefined;
let batchRunning = false;
let smtpTransport: Transporter | undefined;

function getTransport(): Transporter {
  if (!smtpConfigured || !env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.SMTP_FROM) {
    throw new Error("SMTP is not configured");
  }
  smtpTransport ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
  return smtpTransport;
}

function getMailContent(template: QuoteEmailTemplate, payload: QuoteEmailPayload, lang: Language) {
  const pickupAt = new Date(payload.pickupAt).toLocaleString(lang === "el" ? "el-GR" : "en-GB", {
    timeZone: "Europe/Athens",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const returnAt = new Date(payload.returnAt).toLocaleString(lang === "el" ? "el-GR" : "en-GB", {
    timeZone: "Europe/Athens",
    dateStyle: "medium",
    timeStyle: "short",
  });

  if (template === "quote_acknowledgement" && lang === "el") {
    return {
      subject: `Λάβαμε το αίτημα προσφοράς σας — ${payload.reference}`,
      text: [
        `Γεια σας ${payload.customerFirstName},`,
        "",
        "Λάβαμε το αίτημα προσφοράς ενοικίασης. Δεν πρόκειται για επιβεβαιωμένη κράτηση.",
        `Αριθμός αναφοράς: ${payload.reference}`,
        `Κατηγορία οχήματος: ${payload.vehicleCode}`,
        `Παραλαβή: ${pickupAt} — ${payload.pickupLocation}`,
        `Επιστροφή: ${returnAt} — ${payload.returnLocation}`,
        `Πρόσθετα: ${payload.extras.length ? payload.extras.map((extra) => `${extra.name} x${extra.quantity}`).join(", ") : "Κανένα"}`,
        "",
        "Η ομάδα της ACR θα επικοινωνήσει μαζί σας με προσφορά και οδηγίες πληρωμής προκαταβολής.",
        "Μην αποστείλετε στοιχεία κάρτας μέσω email.",
        "",
        "Athens Car Rental",
      ].join("\n"),
    };
  }
  if (template === "quote_acknowledgement") {
    return {
      subject: `We received your rental quote request — ${payload.reference}`,
      text: [
        `Hello ${payload.customerFirstName},`,
        "",
        "We received your rental quote request. This is not a confirmed booking.",
        `Reference: ${payload.reference}`,
        `Vehicle category: ${payload.vehicleCode}`,
        `Pickup: ${pickupAt} — ${payload.pickupLocation}`,
        `Return: ${returnAt} — ${payload.returnLocation}`,
        `Requested extras: ${payload.extras.length ? payload.extras.map((extra) => `${extra.name} x${extra.quantity}`).join(", ") : "None"}`,
        "",
        "The ACR team will contact you with a quote and deposit payment instructions.",
        "Please do not send card details by email.",
        "",
        "Athens Car Rental",
      ].join("\n"),
    };
  }
  if (lang === "el") {
    return {
      subject: `Νέο αίτημα προσφοράς — ${payload.reference}`,
      text: [
        `Αναφορά: ${payload.reference}`,
        `Πελάτης: ${payload.customerFirstName} ${payload.customerLastName}`,
        `Email: ${payload.customerEmail}`,
        `Τηλέφωνο: ${payload.customerPhone}`,
        `Χώρα: ${payload.customerCountry}`,
        `Κατηγορία οχήματος: ${payload.vehicleCode}`,
        `Παραλαβή: ${pickupAt} — ${payload.pickupLocation}`,
        `Επιστροφή: ${returnAt} — ${payload.returnLocation}`,
        `Αριθμός πτήσης: ${payload.flightNumber ?? "—"}`,
        `Κύριος οδηγός: ηλικία ${payload.driverAge}, άδεια ${payload.driverLicenceYears} έτος/έτη, χώρα ${payload.driverCountryCode}, διεθνής άδεια: ${payload.driverHasInternationalPermit ? "ναι" : "όχι"}`,
        `Επιπλέον οδηγοί: ${payload.additionalDrivers.length ? payload.additionalDrivers.map((driver, index) => `#${index + 1} ηλικία ${driver.age}, άδεια ${driver.licenceYears} έτος/έτη, χώρα ${driver.countryCode}, διεθνής άδεια: ${driver.hasInternationalPermit ? "ναι" : "όχι"}`).join("; ") : "Κανένας"}`,
        `Πρόσθετα: ${payload.extras.length ? payload.extras.map((extra) => `${extra.name} x${extra.quantity}${extra.childAge === null ? "" : `, ηλικία παιδιού ${extra.childAge}`}${extra.childWeightKg === null ? "" : `, βάρος παιδιού ${extra.childWeightKg} kg`}`).join("; ") : "Κανένα"}`,
        `Σημειώσεις: ${payload.notes ?? "—"}`,
      ].join("\n"),
    };
  }
  return {
    subject: `New rental quote request — ${payload.reference}`,
    text: [
      `Reference: ${payload.reference}`,
      `Customer: ${payload.customerFirstName} ${payload.customerLastName}`,
      `Email: ${payload.customerEmail}`,
      `Phone: ${payload.customerPhone}`,
      `Country: ${payload.customerCountry}`,
      `Vehicle category: ${payload.vehicleCode}`,
      `Pickup: ${pickupAt} — ${payload.pickupLocation}`,
      `Return: ${returnAt} — ${payload.returnLocation}`,
      `Flight number: ${payload.flightNumber ?? "—"}`,
      `Main driver: age ${payload.driverAge}, licence held ${payload.driverLicenceYears} year(s), country ${payload.driverCountryCode}, international permit: ${payload.driverHasInternationalPermit ? "yes" : "no"}`,
      `Additional drivers: ${payload.additionalDrivers.length ? payload.additionalDrivers.map((driver, index) => `#${index + 1} age ${driver.age}, licence ${driver.licenceYears} year(s), country ${driver.countryCode}, international permit: ${driver.hasInternationalPermit ? "yes" : "no"}`).join("; ") : "None"}`,
      `Extras: ${payload.extras.length ? payload.extras.map((extra) => `${extra.name} x${extra.quantity}${extra.childAge === null ? "" : `, child age ${extra.childAge}`}${extra.childWeightKg === null ? "" : `, child weight ${extra.childWeightKg} kg`}`).join("; ") : "None"}`,
      `Notes: ${payload.notes ?? "—"}`,
    ].join("\n"),
  };
}

function getContactMailContent(
  template: ContactEmailTemplate,
  payload: ContactEmailPayload,
  lang: Language,
) {
  if (template === "contact_acknowledgement" && lang === "el") {
    return {
      subject: "Λάβαμε το μήνυμά σας — Athens Car Rental",
      text: [
        `Γεια σας ${payload.name},`,
        "",
        "Λάβαμε το μήνυμά σας και η ομάδα της Athens Car Rental θα επικοινωνήσει μαζί σας.",
        `Θέμα: ${payload.subject}`,
        "",
        "Athens Car Rental",
      ].join("\n"),
    };
  }
  if (template === "contact_acknowledgement") {
    return {
      subject: "We received your message — Athens Car Rental",
      text: [
        `Hello ${payload.name},`,
        "",
        "We received your message and the Athens Car Rental team will get back to you.",
        `Subject: ${payload.subject}`,
        "",
        "Athens Car Rental",
      ].join("\n"),
    };
  }
  if (lang === "el") {
    return {
      subject: "Νέο μήνυμα επικοινωνίας από τον ιστότοπο ACR",
      text: [
        `Όνομα: ${payload.name}`,
        `Email: ${payload.email}`,
        `Τηλέφωνο: ${payload.phone}`,
        `Θέμα: ${payload.subject}`,
        "",
        "Μήνυμα:",
        payload.message,
      ].join("\n"),
    };
  }
  return {
    subject: "New website contact message — ACR",
    text: [
      `Name: ${payload.name}`,
      `Email: ${payload.email}`,
      `Phone: ${payload.phone}`,
      `Subject: ${payload.subject}`,
      "",
      "Message:",
      payload.message,
    ].join("\n"),
  };
}

function isQuoteEmailTemplate(template: EmailTemplate): template is QuoteEmailTemplate {
  return template === "quote_acknowledgement" || template === "internal_quote_notification";
}

async function deliverOutboxItem(item: {
  id: string;
  recipient: string;
  template: string;
  language: string;
  payload: unknown;
  attempts: number;
}): Promise<void> {
  try {
    const template = z.enum([
      "quote_acknowledgement",
      "internal_quote_notification",
      "contact_acknowledgement",
      "internal_contact_notification",
      "quote_offer",
      "deposit_confirmation",
      "internal_deposit_paid",
    ]).parse(item.template);
    const lang = z.enum(["en", "el"]).parse(item.language);
    const content = template === "quote_offer"
      ? renderQuoteOffer(quoteOfferPayloadSchema.parse(item.payload), lang)
      : template === "deposit_confirmation"
        ? renderDepositConfirmation(depositConfirmationPayloadSchema.parse(item.payload), lang)
        : template === "internal_deposit_paid"
          ? renderInternalDepositPaid(internalDepositPaidPayloadSchema.parse(item.payload), lang)
      : isQuoteEmailTemplate(template)
        ? getMailContent(template, quoteEmailPayloadSchema.parse(item.payload), lang)
        : getContactMailContent(template, contactEmailPayloadSchema.parse(item.payload), lang);
    await getTransport().sendMail({
      from: env.SMTP_FROM,
      to: item.recipient,
      subject: content.subject,
      text: content.text,
      html: "html" in content && typeof content.html === "string" ? content.html : undefined,
    });
    await prisma.emailOutbox.update({
      where: { id: item.id },
      data: { status: EmailDeliveryStatus.SENT, sentAt: new Date(), lastError: null },
    });
    console.info("Email delivered", { outboxId: item.id, template });
  } catch (error) {
    const attempts = item.attempts + 1;
    const delayMs = Math.min(60 * 60 * 1000, 30_000 * (2 ** Math.min(attempts - 1, 7)));
    const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown email delivery error";
    await prisma.emailOutbox.update({
      where: { id: item.id },
      data: {
        attempts,
        status: attempts >= MAX_ATTEMPTS ? EmailDeliveryStatus.FAILED : EmailDeliveryStatus.PENDING,
        nextAttemptAt: new Date(Date.now() + delayMs),
        lastError: message,
      },
    });
    console.error("Quote email delivery failed", { outboxId: item.id, template: item.template, attempts, error });
  }
}

export async function processPendingEmails(batchSize = 10): Promise<void> {
  if (!smtpConfigured || batchRunning) {
    return;
  }
  batchRunning = true;
  try {
    const staleClaim = new Date(Date.now() - 5 * 60 * 1000);
    await prisma.emailOutbox.updateMany({
      where: {
        status: EmailDeliveryStatus.PROCESSING,
        updatedAt: { lt: staleClaim },
      },
      data: { status: EmailDeliveryStatus.PENDING },
    });

    for (let index = 0; index < batchSize; index += 1) {
      const candidate = await prisma.emailOutbox.findFirst({
        where: {
          status: EmailDeliveryStatus.PENDING,
          nextAttemptAt: { lte: new Date() },
        },
        orderBy: { createdAt: "asc" },
      });
      if (!candidate) {
        break;
      }

      const claimed = await prisma.emailOutbox.updateMany({
        where: { id: candidate.id, status: EmailDeliveryStatus.PENDING },
        data: { status: EmailDeliveryStatus.PROCESSING },
      });
      if (claimed.count !== 1) {
        continue;
      }
      await deliverOutboxItem(candidate);
    }
  } catch (error) {
    console.error("Email outbox processing failed", error);
  } finally {
    batchRunning = false;
  }
}

export function startEmailOutboxWorker(): void {
  if (!smtpConfigured) {
    console.warn("SMTP is not configured; notification emails will remain queued");
    return;
  }
  const run = async (): Promise<void> => {
    await processPendingEmails();
    timer = setTimeout(() => void run(), POLL_INTERVAL_MS);
  };
  void run();
}

export async function stopEmailOutboxWorker(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
  }
  await smtpTransport?.close();
  smtpTransport = undefined;
}
