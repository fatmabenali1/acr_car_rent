import { escapeHtml, formatRentalDate, page, type EmailContent, type EmailLanguage } from "./common";

export type DepositConfirmationPayload = {
  reference: string;
  customerFirstName: string;
  amountPaidEur: string;
  totalPaidEur: string;
  balanceRemainingEur: string;
  pickupAt: string;
  pickupLocation: string;
  agencyPhones: string[];
};

export function renderDepositConfirmation(
  payload: DepositConfirmationPayload,
  language: EmailLanguage,
): EmailContent {
  const isGreek = language === "el";
  const pickupAt = formatRentalDate(payload.pickupAt, language);
  const phones = payload.agencyPhones.join(" / ");
  const subject = isGreek
    ? `Επιβεβαίωση προκαταβολής — ${payload.reference}`
    : `Deposit payment confirmed — ${payload.reference}`;
  const values = isGreek
    ? {
      paid: "Ποσό προκαταβολής που πληρώθηκε",
      balance: "Υπόλοιπο πληρωτέο κατά την παράδοση",
      pickup: "Παραλαβή",
      shuttle: "Δωρεάν μεταφορά από την πόρτα 3 της αίθουσας αφίξεων. Το γραφείο μας βρίσκεται 5 λεπτά από το αεροδρόμιο.",
      documents: "Έχετε μαζί σας άδεια οδήγησης που την κατέχετε για περισσότερο από ένα έτος και διεθνή άδεια οδήγησης, εφόσον απαιτείται.",
      hello: "Γεια σας",
    }
    : {
      paid: "Deposit amount paid",
      balance: "Balance due at vehicle delivery",
      pickup: "Pickup",
      shuttle: "Free shuttle from door no. 3 in the arrivals hall. Our office is 5 minutes from the airport.",
      documents: "Please bring a driving licence held for more than one year and an international driving permit if required.",
      hello: "Hello",
    };
  const text = [
    `${values.hello} ${payload.customerFirstName},`,
    "",
    `${isGreek ? "Αναφορά" : "Reference"}: ${payload.reference}`,
    `${values.paid}: ${isGreek ? "€" : "EUR "}${payload.amountPaidEur}`,
    `${values.balance}: ${isGreek ? "€" : "EUR "}${payload.balanceRemainingEur}`,
    `${values.pickup}: ${pickupAt} — ${payload.pickupLocation}`,
    "",
    values.shuttle,
    values.documents,
    "",
    `${isGreek ? "Τηλέφωνα ACR" : "ACR phone"}: ${phones}`,
  ].join("\n");
  const html = page(subject, `<p>${values.hello} ${escapeHtml(payload.customerFirstName)},</p>
    <p><strong>${isGreek ? "Αναφορά" : "Reference"}:</strong> ${escapeHtml(payload.reference)}</p>
    <p><strong>${values.paid}:</strong> ${isGreek ? "€" : "EUR "}${escapeHtml(payload.amountPaidEur)}<br>
    <strong>${values.balance}:</strong> ${isGreek ? "€" : "EUR "}${escapeHtml(payload.balanceRemainingEur)}</p>
    <p><strong>${values.pickup}:</strong> ${escapeHtml(pickupAt)} — ${escapeHtml(payload.pickupLocation)}</p>
    <p>${values.shuttle}</p><p>${values.documents}</p>
    <p>${isGreek ? "Τηλέφωνα ACR" : "ACR phone"}: ${escapeHtml(phones)}</p>`);
  return { subject, text, html };
}
