import nodemailer, { type Transporter } from "nodemailer";
import { env, smtpConfigured } from "../config/env";
import { escapeHtml, formatRentalDate } from "./email-templates/common";

export type ReservationEmailData = {
  reference: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  categoryCode: string;
  categoryName: string;
  exampleModels: string[];
  driverAge: number;
  driverLicenceYears: number;
  coupon: string;
  pickupLocation: string;
  returnLocation: string;
  pickupAt: string;
  returnAt: string;
  days: number;
  total: number;
  deposit: number;
  notes: string;
  language: "en" | "el";
};

type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type MailTransport = Pick<Transporter, "sendMail">;

const AGENCY_EMAIL = env.MAIL_AGENCY_TO ?? env.MAIL_TO_AGENCY ?? env.AGENCY_EMAIL;
let smtpTransport: Transporter | undefined;
let testTransport: MailTransport | undefined;

function getTransport(): MailTransport {
  if (testTransport) return testTransport;
  if (smtpConfigured && env.SMTP_HOST && env.SMTP_FROM) {
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
  if (env.NODE_ENV !== "production") {
    smtpTransport ??= nodemailer.createTransport({ jsonTransport: true });
    return smtpTransport;
  }
  throw new Error("SMTP is not configured");
}

function money(value: number): string {
  return value.toFixed(2);
}

function createMessages(data: ReservationEmailData): MailMessage[] {
  const isGreek = data.language === "el";
  const pickupAt = formatRentalDate(data.pickupAt, data.language);
  const returnAt = formatRentalDate(data.returnAt, data.language);
  const frontendUrl = (env.FRONTEND_URL ?? env.APP_URL).replace(/\/+$/, "");
  const paymentUrl = `${frontendUrl}/pay?ref=${encodeURIComponent(data.reference)}`;
  const cancellationDays = ["D3", "G", "G1", "G2", "F"].includes(data.categoryCode) ? 15 : 7;
  const safe = {
    firstName: escapeHtml(data.firstName),
    lastName: escapeHtml(data.lastName),
    email: escapeHtml(data.email),
    phone: escapeHtml(data.phone),
    country: escapeHtml(data.country),
    categoryCode: escapeHtml(data.categoryCode),
    categoryName: escapeHtml(data.categoryName),
    exampleModels: escapeHtml(data.exampleModels.join(", ") || "—"),
    pickupLocation: escapeHtml(data.pickupLocation),
    returnLocation: escapeHtml(data.returnLocation),
    pickupAt: escapeHtml(pickupAt),
    returnAt: escapeHtml(returnAt),
    notes: escapeHtml(data.notes).replace(/\r?\n/g, "<br>"),
    reference: escapeHtml(data.reference),
    paymentUrl: escapeHtml(paymentUrl),
  };
  const subject = isGreek
    ? `Το αίτημα κράτησης Athens Car Rental [${data.reference}]`
    : `Your Athens Car Rental reservation request [${data.reference}]`;
  const cancellation = isGreek
    ? `Πλήρης επιστροφή χρημάτων για ακύρωση τουλάχιστον ${cancellationDays} ημέρες πριν από την παραλαβή.`
    : `Full refund when cancelled at least ${cancellationDays} days before pick-up.`;
  const customerText = [
    `${isGreek ? "Γεια σας" : "Hello"} ${data.firstName},`,
    `${isGreek ? "Αριθμός κράτησης" : "Reservation number"}: ${data.reference}`,
    `${isGreek ? "Κατηγορία" : "Category"}: ${data.categoryName} (${data.categoryCode})`,
    `${isGreek ? "Παραλαβή" : "Pick-up"}: ${pickupAt} — ${data.pickupLocation}`,
    `${isGreek ? "Επιστροφή" : "Return"}: ${returnAt} — ${data.returnLocation}`,
    `${isGreek ? "Ημέρες" : "Rental days"}: ${data.days}`,
    `${isGreek ? "Εκτιμώμενο σύνολο" : "Estimated total"}: EUR ${money(data.total)}`,
    `${isGreek ? "Προκαταβολή" : "Deposit due"}: EUR ${money(data.deposit)}`,
    cancellation,
    `${isGreek ? "Πληρώστε την προκαταβολή" : "Pay your deposit"}: ${paymentUrl}`,
    "+30 210 6022220 / +30 210 6624887",
    env.AGENCY_EMAIL,
  ].join("\n");
  const customerHtml = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;background:#f7f4ef;color:#111;font-family:Arial,sans-serif;line-height:1.55">
      <main style="max-width:640px;margin:auto;padding:24px">
        <section style="background:#111;border-radius:16px;padding:24px;color:#fff">
          <h1 style="font-size:22px;margin:0;color:#facc15">${isGreek ? "Αίτημα κράτησης" : "Reservation request"}</h1>
          <p>${isGreek ? "Αριθμός κράτησης" : "Reservation number"}: <strong>${safe.reference}</strong></p>
        </section>
        <section style="background:#fff;border-radius:16px;margin-top:16px;padding:24px">
          <p>${isGreek ? "Γεια σας" : "Hello"} ${safe.firstName},</p>
          <p><strong>${isGreek ? "Κατηγορία" : "Category"}:</strong> ${safe.categoryName} (${safe.categoryCode})</p>
          <p><strong>${isGreek ? "Μοντέλα" : "Models"}:</strong> ${safe.exampleModels} or similar</p>
          <p><strong>${isGreek ? "Παραλαβή" : "Pick-up"}:</strong> ${safe.pickupAt} — ${safe.pickupLocation}<br>
            <strong>${isGreek ? "Επιστροφή" : "Return"}:</strong> ${safe.returnAt} — ${safe.returnLocation}<br>
            <strong>${isGreek ? "Ημέρες" : "Rental days"}:</strong> ${data.days}</p>
          <p><strong>${isGreek ? "Εκτιμώμενο σύνολο" : "Estimated total"}:</strong> EUR ${money(data.total)}<br>
            <strong>${isGreek ? "Προκαταβολή" : "Deposit due"}:</strong> EUR ${money(data.deposit)}</p>
          <p>${escapeHtml(cancellation)}</p>
          <p style="text-align:center;margin:28px 0">
            <a href="${safe.paymentUrl}" style="display:inline-block;background:#facc15;border-radius:10px;padding:14px 22px;color:#111;font-weight:bold;text-decoration:none">
              ${isGreek ? "Πληρώστε την προκαταβολή" : "Pay your deposit"}
            </a>
          </p>
          <p>+30 210 6022220 / +30 210 6624887<br>${escapeHtml(env.AGENCY_EMAIL)}</p>
        </section>
      </main>
    </body></html>`;
  const agencySubject = `${isGreek ? "Νέο αίτημα κράτησης" : "New reservation request"} [${data.reference}]`;
  const agencyText = [
    `Reference: ${data.reference}`,
    `Customer: ${data.firstName} ${data.lastName}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    `Country: ${data.country}`,
    `Category: ${data.categoryName} (${data.categoryCode})`,
    `Example models: ${data.exampleModels.join(", ") || "—"}`,
    `Pick-up: ${pickupAt} — ${data.pickupLocation}`,
    `Return: ${returnAt} — ${data.returnLocation}`,
    `Driver / rental days: ${data.days}`,
    `Driver age: ${data.driverAge}`,
    `Years holding licence: ${data.driverLicenceYears}`,
    `Coupon: ${data.coupon || "—"}`,
    `Estimated total: EUR ${money(data.total)}`,
    `Deposit due: EUR ${money(data.deposit)}`,
    `Notes: ${data.notes || "—"}`,
  ].join("\n");
  const agencyHtml = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111">
    <h1>New reservation request [${safe.reference}]</h1>
    <p><strong>Customer:</strong> ${safe.firstName} ${safe.lastName}<br>
    <strong>Email:</strong> ${safe.email}<br><strong>Phone:</strong> ${safe.phone}<br>
    <strong>Country:</strong> ${safe.country}</p>
    <p><strong>Category:</strong> ${safe.categoryName} (${safe.categoryCode})<br>
    <strong>Example models:</strong> ${safe.exampleModels}<br>
    <strong>Pick-up:</strong> ${safe.pickupAt} — ${safe.pickupLocation}<br>
    <strong>Return:</strong> ${safe.returnAt} — ${safe.returnLocation}<br>
    <strong>Rental days:</strong> ${data.days}<br>
    <strong>Driver age:</strong> ${data.driverAge}<br>
    <strong>Years holding licence:</strong> ${data.driverLicenceYears}<br>
    <strong>Coupon:</strong> ${escapeHtml(data.coupon || "—")}<br>
    <strong>Estimated total:</strong> EUR ${money(data.total)}<br>
    <strong>Deposit:</strong> EUR ${money(data.deposit)}</p>
    <p><strong>Notes:</strong><br>${safe.notes || "—"}</p></body></html>`;

  return [
    { to: data.email, subject, text: customerText, html: customerHtml },
    { to: AGENCY_EMAIL, subject: agencySubject, text: agencyText, html: agencyHtml },
  ];
}

export async function sendReservationEmails(
  data: ReservationEmailData,
  transport?: MailTransport,
): Promise<boolean> {
  const hasDeliveryTransport = smtpConfigured || Boolean(testTransport) || Boolean(transport);
  const mailTransport = transport ?? getTransport();
  let allSent = true;
  for (const message of createMessages(data)) {
    let sent = false;
    for (let attempt = 1; attempt <= 3 && !sent; attempt += 1) {
      try {
        await mailTransport.sendMail({
          from: env.SMTP_FROM ?? "Athens Car Rental <no-reply@example.invalid>",
          ...message,
        });
        sent = true;
      } catch (error) {
        const code = typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : "DELIVERY_ERROR";
        console.error("Reservation email delivery failed", {
          reference: data.reference,
          attempt,
          code,
        });
      }
    }
    if (!sent) allSent = false;
  }
  return allSent && hasDeliveryTransport;
}

export function configureReservationEmailTransportForTests(transport: MailTransport | null): void {
  testTransport = transport ?? undefined;
}

export { createMessages as createReservationEmailMessages };
