import { escapeHtml, formatRentalDate, page, type EmailContent, type EmailLanguage } from "./common";

export type InternalDepositPaidPayload = {
  reference: string;
  customerName: string;
  customerEmail: string;
  amountPaidEur: string;
  totalPaidEur: string;
  balanceRemainingEur: string;
  pickupAt: string;
  pickupLocation?: string;
  returnAt?: string;
  returnLocation?: string;
  category?: string;
}

export function renderInternalDepositPaid(
  payload: InternalDepositPaidPayload,
  language: EmailLanguage,
): EmailContent {
  const isGreek = language === "el";
  const subject = isGreek
    ? `Πληρώθηκε προκαταβολή — ${payload.reference}`
    : `Deposit paid — ${payload.reference}`;
  const pickupAt = formatRentalDate(payload.pickupAt, language);
  const returnAt = payload.returnAt ? formatRentalDate(payload.returnAt, language) : "—";
  const text = [
    `${isGreek ? "Πληρώθηκε προκαταβολή" : "Deposit payment received"}`,
    `${isGreek ? "Αναφορά" : "Reference"}: ${payload.reference}`,
    `${isGreek ? "Πελάτης" : "Customer"}: ${payload.customerName}`,
    `Email: ${payload.customerEmail}`,
    `${isGreek ? "Ποσό πληρωμής" : "Amount paid"}: ${isGreek ? "€" : "EUR "}${payload.amountPaidEur}`,
    `${isGreek ? "Σύνολο προκαταβολών" : "Total deposits paid"}: ${isGreek ? "€" : "EUR "}${payload.totalPaidEur}`,
    `${isGreek ? "Υπόλοιπο" : "Balance remaining"}: ${isGreek ? "€" : "EUR "}${payload.balanceRemainingEur}`,
    `${isGreek ? "Παραλαβή" : "Pickup"}: ${pickupAt}`,
    `${isGreek ? "Τοποθεσία παραλαβής" : "Pickup location"}: ${payload.pickupLocation ?? "—"}`,
    `${isGreek ? "Επιστροφή" : "Drop-off"}: ${returnAt} — ${payload.returnLocation ?? "—"}`,
    `${isGreek ? "Κατηγορία" : "Category"}: ${payload.category ?? "—"}`,
  ].join("\n");
  const html = page(subject, `<p>${isGreek ? "Πληρώθηκε προκαταβολή" : "Deposit payment received"}</p>
    <p><strong>${isGreek ? "Αναφορά" : "Reference"}:</strong> ${escapeHtml(payload.reference)}<br>
    <strong>${isGreek ? "Πελάτης" : "Customer"}:</strong> ${escapeHtml(payload.customerName)}<br>
    <strong>Email:</strong> ${escapeHtml(payload.customerEmail)}<br>
    <strong>${isGreek ? "Ποσό πληρωμής" : "Amount paid"}:</strong> ${isGreek ? "€" : "EUR "}${escapeHtml(payload.amountPaidEur)}<br>
    <strong>${isGreek ? "Σύνολο προκαταβολών" : "Total deposits paid"}:</strong> ${isGreek ? "€" : "EUR "}${escapeHtml(payload.totalPaidEur)}<br>
    <strong>${isGreek ? "Υπόλοιπο" : "Balance remaining"}:</strong> ${isGreek ? "€" : "EUR "}${escapeHtml(payload.balanceRemainingEur)}<br>
    <strong>${isGreek ? "Παραλαβή" : "Pickup"}:</strong> ${escapeHtml(pickupAt)} — ${escapeHtml(payload.pickupLocation ?? "—")}<br>
    <strong>${isGreek ? "Επιστροφή" : "Drop-off"}:</strong> ${escapeHtml(returnAt)} — ${escapeHtml(payload.returnLocation ?? "—")}<br>
    <strong>${isGreek ? "Κατηγορία" : "Category"}:</strong> ${escapeHtml(payload.category ?? "—")}</p>`);
  return { subject, text, html };
}
