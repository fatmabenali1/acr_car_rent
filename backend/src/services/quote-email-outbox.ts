import { EmailDeliveryStatus, Prisma } from "@prisma/client";
import nodemailer, { type Transporter } from "nodemailer";
import { z } from "zod";
import { env, smtpConfigured } from "../config/env";
import { prisma } from "../db";
import { escapeHtml, page } from "./email-templates/common";
import { renderDepositConfirmation, type DepositConfirmationPayload } from "./email-templates/deposit-confirmation";
import { renderInternalDepositPaid, type InternalDepositPaidPayload } from "./email-templates/internal-deposit-paid";
import { renderQuoteOffer, type QuoteOfferPayload } from "./email-templates/quote-offer";

const MAX_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 5_000;

const quoteEmailPayloadSchema = z.object({
  reference: z.string().regex(/^(?:\d{4}[A-Z]{2}|ACR-\d{4}-[A-Z0-9]{6})$/),
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
  reference: z.string().regex(/^(?:\d{4}[A-Z]{2}|ACR-\d{4}-[A-Z0-9]{6})$/),
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
  reference: z.string().min(1).max(64),
  customerFirstName: z.string(),
  amountPaidEur: z.string(),
  totalPaidEur: z.string(),
  balanceRemainingEur: z.string(),
  pickupAt: z.string().datetime(),
  pickupLocation: z.string(),
  returnAt: z.string().datetime().optional(),
  returnLocation: z.string().optional(),
  category: z.string().optional(),
  agencyPhones: z.array(z.string()),
});
const internalDepositPaidPayloadSchema: z.ZodType<InternalDepositPaidPayload> = z.object({
  reference: z.string().min(1).max(64),
  customerName: z.string(),
  customerEmail: z.string().email(),
  amountPaidEur: z.string(),
  totalPaidEur: z.string(),
  balanceRemainingEur: z.string(),
  pickupAt: z.string().datetime(),
  pickupLocation: z.string().optional(),
  returnAt: z.string().datetime().optional(),
  returnLocation: z.string().optional(),
  category: z.string().optional(),
});

let timer: NodeJS.Timeout | undefined;
let batchRunning = false;
let smtpTransport: Transporter | undefined;

function getTransport(): Transporter {
  if (!smtpConfigured || !env.SMTP_HOST || !env.SMTP_FROM) {
    throw new Error("SMTP is not configured");
  }
  smtpTransport ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
    ...(env.SMTP_USER && env.SMTP_PASSWORD
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
      : {}),
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
  const isCustomerEmail = template === "quote_acknowledgement";
  const extras = payload.extras.length
    ? payload.extras.map((extra) => `${extra.name} x${extra.quantity}`).join(", ")
    : lang === "el" ? "Κανένα" : "None";
  const customerName = `${payload.customerFirstName} ${payload.customerLastName}`.trim();
  const title = isCustomerEmail
    ? lang === "el" ? `Λάβαμε το αίτημα προσφοράς σας — ${payload.reference}` : `We received your rental quote request — ${payload.reference}`
    : lang === "el" ? `Νέο αίτημα προσφοράς — ${payload.reference}` : `New rental quote request — ${payload.reference}`;
  const rows: Array<[string, string]> = isCustomerEmail
    ? [
      [lang === "el" ? "Αναφορά" : "Reference", payload.reference],
      [lang === "el" ? "Κατηγορία οχήματος" : "Vehicle category", payload.vehicleCode],
      [lang === "el" ? "Παραλαβή" : "Pickup", `${pickupAt} — ${payload.pickupLocation}`],
      [lang === "el" ? "Επιστροφή" : "Return", `${returnAt} — ${payload.returnLocation}`],
      [lang === "el" ? "Πρόσθετα" : "Requested extras", extras],
    ]
    : [
      [lang === "el" ? "Αναφορά" : "Reference", payload.reference],
      [lang === "el" ? "Κατηγορία οχήματος" : "Vehicle category", payload.vehicleCode],
      [lang === "el" ? "Παραλαβή" : "Pickup", `${pickupAt} — ${payload.pickupLocation}`],
      [lang === "el" ? "Επιστροφή" : "Return", `${returnAt} — ${payload.returnLocation}`],
      [lang === "el" ? "Ηλικία οδηγού" : "Driver age", String(payload.driverAge)],
      [lang === "el" ? "Πελάτης" : "Customer", customerName],
      ["Email", payload.customerEmail],
      [lang === "el" ? "Τηλέφωνο" : "Phone", payload.customerPhone],
      [lang === "el" ? "Σημειώσεις" : "Notes", payload.notes?.trim() || (lang === "el" ? "—" : "—")],
    ];
  const rowsHtml = rows.map(([label, value]) => `<tr>
    <td style="width:34%;padding:10px 12px;border-bottom:1px solid #e5e5e5;background-color:#fff8d6;font-weight:bold;vertical-align:top">${escapeHtml(label)}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #e5e5e5;vertical-align:top;white-space:pre-wrap">${escapeHtml(value)}</td>
  </tr>`).join("");
  const introduction = isCustomerEmail
    ? lang === "el"
      ? "Λάβαμε το αίτημα προσφοράς ενοικίασης. Δεν πρόκειται για επιβεβαιωμένη κράτηση."
      : "We received your rental quote request. This is not a confirmed booking."
    : lang === "el" ? "Νέο αίτημα προσφοράς ενοικίασης." : "New rental quote request.";
  const closing = isCustomerEmail
    ? lang === "el"
      ? "Η ομάδα της ACR θα επικοινωνήσει μαζί σας με προσφορά και οδηγίες πληρωμής προκαταβολής. Μην αποστείλετε στοιχεία κάρτας μέσω email."
      : "The ACR team will contact you with a quote and deposit payment instructions. Please do not send card details by email."
    : "";
  const html = page(title, `<p style="margin:0 0 16px">${isCustomerEmail
    ? `${lang === "el" ? "Γεια σας" : "Hello"} ${escapeHtml(payload.customerFirstName)},<br>`
    : ""}${escapeHtml(introduction)}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;font-size:14px">${rowsHtml}</table>
    ${isCustomerEmail
    ? `<p style="margin:20px 0 0">${escapeHtml(closing)}</p>
      <p style="margin:16px 0 0"><strong>${lang === "el" ? "Επικοινωνία ACR" : "ACR contact"}:</strong><br>
      ${escapeHtml(env.AGENCY_PHONE)}<br><a href="mailto:${escapeHtml(env.AGENCY_EMAIL)}" style="color:#111111">${escapeHtml(env.AGENCY_EMAIL)}</a></p>`
    : ""}`);

  if (template === "quote_acknowledgement" && lang === "el") {
    return {
      subject: title,
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
        `Επικοινωνία ACR: ${env.AGENCY_PHONE} · ${env.AGENCY_EMAIL}`,
        "Athens Car Rental",
      ].join("\n"),
      html,
    };
  }
  if (template === "quote_acknowledgement") {
    return {
      subject: title,
      text: [
        `Hello ${payload.customerFirstName},`,
        "",
        "We received your rental quote request. This is not a confirmed booking.",
        `Reference: ${payload.reference}`,
        `Vehicle category: ${payload.vehicleCode}`,
        `Pickup: ${pickupAt} — ${payload.pickupLocation}`,
        `Return: ${returnAt} — ${payload.returnLocation}`,
        `Requested extras: ${extras}`,
        "",
        "The ACR team will contact you with a quote and deposit payment instructions.",
        "Please do not send card details by email.",
        "",
        `ACR contact: ${env.AGENCY_PHONE} · ${env.AGENCY_EMAIL}`,
      ].join("\n"),
      html,
    };
  }
  if (lang === "el") {
    return {
      subject: title,
      text: [
        `${introduction}`,
        `Αναφορά: ${payload.reference}`,
        `Κατηγορία οχήματος: ${payload.vehicleCode}`,
        `Παραλαβή: ${pickupAt} — ${payload.pickupLocation}`,
        `Επιστροφή: ${returnAt} — ${payload.returnLocation}`,
        `Ηλικία οδηγού: ${payload.driverAge}`,
        `Πελάτης: ${customerName}`,
        `Email: ${payload.customerEmail}`,
        `Τηλέφωνο: ${payload.customerPhone}`,
        `Σημειώσεις: ${payload.notes ?? "—"}`,
      ].join("\n"),
      html,
    };
  }
  return {
    subject: title,
    text: [
      introduction,
      `Reference: ${payload.reference}`,
      `Vehicle category: ${payload.vehicleCode}`,
      `Pickup: ${pickupAt} — ${payload.pickupLocation}`,
      `Return: ${returnAt} — ${payload.returnLocation}`,
      `Driver age: ${payload.driverAge}`,
      `Customer: ${customerName}`,
      `Email: ${payload.customerEmail}`,
      `Phone: ${payload.customerPhone}`,
      `Notes: ${payload.notes?.trim() || "—"}`,
    ].join("\n"),
    html,
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
    const loggedError = process.env.NODE_ENV === "production"
      ? {
          name: error instanceof Error ? error.name : "UnknownError",
          code: typeof error === "object" && error !== null && "code" in error
            ? String(error.code)
            : undefined,
        }
      : error;
    console.error("Quote email delivery failed", { outboxId: item.id, template: item.template, attempts, error: loggedError });
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
    if (process.env.NODE_ENV === "production") {
      console.error("Email outbox processing failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
    } else {
      console.error("Email outbox processing failed", error);
    }
  } finally {
    batchRunning = false;
  }
}

export async function queueDepositPaidEmails(
  transaction: Prisma.TransactionClient,
  quoteId: string,
): Promise<void> {
  const quote = await transaction.quote.findUnique({
    where: { id: quoteId },
    include: {
      pickupLocation: { select: { name: true, slug: true } },
      returnLocation: { select: { name: true, slug: true } },
      vehicles: { include: { vehicle: { select: { code: true, name: true } } } },
      payments: { where: { status: "PAID" }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!quote || quote.payments.length === 0) {
    throw new Error("Cannot queue payment emails without a paid booking and payment");
  }
  const localized = (value: Prisma.JsonValue, fallback: string): string => {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const text = value.en;
      if (typeof text === "string") return text;
    }
    return fallback;
  };
  const category = quote.vehicles.map(({ vehicle }) => localized(vehicle.name, vehicle.code)).join(", ") || quote.categorySlug || "—";
  const pickupLocation = quote.pickupLocationLabel
    ?? localized(quote.pickupLocation.name, quote.pickupLocation.slug);
  const returnLocation = quote.returnLocationLabel
    ?? localized(quote.returnLocation.name, quote.returnLocation.slug);
  const amountPaid = quote.payments.reduce((sum, payment) => sum + Number(payment.amountEur), 0);
  const total = Number(quote.quotedTotalEur ?? 0);
  const common = {
    reference: quote.reference,
    amountPaidEur: amountPaid.toFixed(2),
    totalPaidEur: amountPaid.toFixed(2),
    balanceRemainingEur: Math.max(0, total - amountPaid).toFixed(2),
    pickupAt: quote.pickupAt.toISOString(),
    pickupLocation,
    returnAt: quote.returnAt.toISOString(),
    returnLocation,
    category,
  };
  const templates = ["deposit_confirmation", "internal_deposit_paid"];
  const existing = await transaction.emailOutbox.findMany({
    where: { quoteId, template: { in: templates } },
    select: { template: true },
  });
  const alreadyQueued = new Set(existing.map((item) => item.template));
  const language = quote.language === "el" ? "el" : "en";
  const agencyEmail = env.MAIL_TO_AGENCY ?? env.AGENCY_EMAIL;
  if (!alreadyQueued.has("deposit_confirmation")) {
    const payload: DepositConfirmationPayload = {
      ...common,
      customerFirstName: quote.customerFirstName,
      agencyPhones: [env.AGENCY_PHONE, env.AGENCY_SECONDARY_PHONE],
    };
    await transaction.emailOutbox.create({
      data: {
        quoteId,
        recipient: quote.customerEmail,
        template: "deposit_confirmation",
        language,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }
  if (!alreadyQueued.has("internal_deposit_paid")) {
    const payload: InternalDepositPaidPayload = {
      ...common,
      customerName: `${quote.customerFirstName} ${quote.customerLastName}`,
      customerEmail: quote.customerEmail,
    };
    await transaction.emailOutbox.create({
      data: {
        quoteId,
        recipient: agencyEmail,
        template: "internal_deposit_paid",
        language,
        payload: payload as Prisma.InputJsonValue,
      },
    });
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
