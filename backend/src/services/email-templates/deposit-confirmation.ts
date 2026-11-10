import { escapeHtml, formatRentalDate, page, type EmailContent, type EmailLanguage } from "./common";

export type DepositConfirmationPayload = {
  reference: string;
  customerFirstName: string;
  amountPaidEur: string;
  totalPaidEur: string;
  balanceRemainingEur: string;
  pickupAt: string;
  pickupLocation: string;
  returnAt?: string;
  returnLocation?: string;
  category?: string;
  agencyPhones: string[];
}

export function renderDepositConfirmation(
  payload: DepositConfirmationPayload,
  language: EmailLanguage,
): EmailContent {
  const isGreek = language === "el";
  const pickupAt = formatRentalDate(payload.pickupAt, language);
  const returnAt = payload.returnAt ? formatRentalDate(payload.returnAt, language) : "—";
  const phones = payload.agencyPhones.join(" / ");
  const subject = isGreek
    ? `Επιβεβαίωση προκαταβολής — ${payload.reference}`
    : `Deposit payment confirmed — ${payload.reference}`;
  const values = isGreek
    ? {
      paid: "Ποσό προκαταβολής που πληρώθηκε",
      balance: "Υπόλοιπο πληρωτέο κατά την παράδοση",
      pickup: "Παραλαβή",
      dropoff: "Επιστροφή",
      category: "Κατηγορία οχήματος",
      shuttle: "Δωρεάν μεταφορά από την πόρτα 3 της αίθουσας αφίξεων. Το γραφείο μας βρίσκεται 5 λεπτά από το αεροδρόμιο.",
      documents: "Έχετε μαζί σας άδεια οδήγησης που την κατέχετε για περισσότερο από ένα έτος και διεθνή άδεια οδήγησης, εφόσον απαιτείται.",
      hello: "Γεια σας",
    }
    : {
      paid: "Deposit amount paid",
      balance: "Balance due at vehicle delivery",
      pickup: "Pickup",
      dropoff: "Drop-off",
      category: "Vehicle category",
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
    `${values.dropoff}: ${returnAt} — ${payload.returnLocation ?? "—"}`,
    `${values.category}: ${payload.category ?? "—"}`,
    "",
    "The rental agreement includes a pre-authorization on a credit card at pickup. The deposit refund is subject to the cancellation notice period: 7 days for small and medium cars, or 15 days for SUVs and minivans. Refunds are handled manually.",
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
    <p><strong>${values.dropoff}:</strong> ${escapeHtml(returnAt)} — ${escapeHtml(payload.returnLocation ?? "—")}<br>
    <strong>${values.category}:</strong> ${escapeHtml(payload.category ?? "—")}</p>
    <p>The rental agreement includes a pre-authorization on a credit card at pickup. The deposit refund is subject to the cancellation notice period: 7 days for small and medium cars, or 15 days for SUVs and minivans. Refunds are handled manually.</p>
    <p>${values.shuttle}</p><p>${values.documents}</p>
    <p>${isGreek ? "Τηλέφωνα ACR" : "ACR phone"}: ${escapeHtml(phones)}</p>`);
  return { subject, text, html };
}
