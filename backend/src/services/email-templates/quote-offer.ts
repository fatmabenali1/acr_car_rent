import { escapeHtml, formatRentalDate, page, type EmailContent, type EmailLanguage } from "./common";

export type QuoteOfferPayload = {
  reference: string;
  customerFirstName: string;
  vehicleCategories: Array<{
    code: string;
    exampleModels: string[];
    cdwExcessEur: string | null;
    cancellationNoticeDays: number | null;
  }>;
  pickupAt: string;
  returnAt: string;
  pickupLocation: string;
  returnLocation: string;
  totalEur: string;
  depositEur: string;
  kilometresIncluded: string;
  inclusions: string[];
  extras: string[];
  paymentUrl: string;
  agencyPhones: string[];
};

function renderCategories(
  payload: QuoteOfferPayload,
  language: EmailLanguage,
): Array<{ text: string; html: string }> {
  return payload.vehicleCategories.map((category) => {
    const models = category.exampleModels.length
      ? `${category.exampleModels.join(", ")} ${language === "el" ? "ή παρόμοιο" : "or similar"}`
      : language === "el" ? "μοντέλα της κατηγορίας ή παρόμοιο" : "category model or similar";
    const excess = category.cdwExcessEur === null
      ? language === "el" ? "Επικοινωνήστε με την ACR για το ποσό απαλλαγής CDW." : "Contact ACR to confirm the CDW excess."
      : language === "el"
        ? `Απαλλαγή CDW: €${category.cdwExcessEur}.`
        : `CDW excess: EUR ${category.cdwExcessEur}.`;
    const cancellation = category.cancellationNoticeDays === null
      ? language === "el"
        ? "Επικοινωνήστε με την ACR για τους όρους ακύρωσης."
        : "Contact ACR to confirm the cancellation terms."
      : language === "el"
        ? `Η προκαταβολή επιστρέφεται αν ενημερώσετε τουλάχιστον ${category.cancellationNoticeDays} ημέρες πριν από την παραλαβή.`
        : `The deposit is refundable when cancellation is received at least ${category.cancellationNoticeDays} days before pickup.`;
    return {
      text: [
        `${language === "el" ? "Κατηγορία" : "Category"} ${category.code}: ${models}`,
        excess,
        language === "el"
          ? "Η απαλλαγή CDW προεγκρίνεται στην κάρτα κατά την παραλαβή· δεν γίνεται χρέωση."
          : "The CDW excess is pre-authorized on the card at pickup; it is not charged.",
        cancellation,
      ].join("\n"),
      html: `<li><strong>${escapeHtml(category.code)}</strong>: ${escapeHtml(models)}<br>
        ${escapeHtml(excess)}<br>
        ${language === "el"
          ? "Η απαλλαγή CDW προεγκρίνεται στην κάρτα κατά την παραλαβή· δεν γίνεται χρέωση."
          : "The CDW excess is pre-authorized on the card at pickup; it is not charged."}<br>
        ${escapeHtml(cancellation)}</li>`,
    };
  });
}

export function renderQuoteOffer(payload: QuoteOfferPayload, language: EmailLanguage): EmailContent {
  const isGreek = language === "el";
  const pickupAt = formatRentalDate(payload.pickupAt, language);
  const returnAt = formatRentalDate(payload.returnAt, language);
  const categories = renderCategories(payload, language);
  const inclusionLines = payload.inclusions.length
    ? payload.inclusions.map((item) => `- ${item}`).join("\n")
    : isGreek ? "Επικοινωνήστε με την ACR για τις περιλαμβανόμενες παροχές." : "Contact ACR to confirm rental inclusions.";
  const extrasLines = payload.extras.length
    ? payload.extras.map((item) => `- ${item}`).join("\n")
    : isGreek ? "Κανένα" : "None";
  const phones = payload.agencyPhones.join(" / ");
  const subject = isGreek
    ? `Η προσφορά ενοικίασης — ${payload.reference}`
    : `Your rental quote — ${payload.reference}`;
  const text = isGreek
    ? [
      `Γεια σας ${payload.customerFirstName},`,
      "",
      `Αναφορά: ${payload.reference}`,
      ...categories.map((category) => category.text),
      `Παραλαβή: ${pickupAt} — ${payload.pickupLocation}`,
      `Επιστροφή: ${returnAt} — ${payload.returnLocation}`,
      `Σύνολο με ΦΠΑ 24%: €${payload.totalEur}`,
      `Προκαταβολή: €${payload.depositEur}`,
      `Χιλιόμετρα: ${payload.kilometresIncluded}`,
      "",
      "Περιλαμβάνονται:",
      inclusionLines,
      "",
      "Επιλεγμένα πρόσθετα:",
      extrasLines,
      "",
      `Πληρωμή προκαταβολής: ${payload.paymentUrl}`,
      `Επικοινωνία ACR: ${phones}`,
      "",
      "Η προσφορά δεν αποτελεί επιβεβαιωμένη κράτηση. Η επιβεβαίωση ακολουθεί την πληρωμή της προκαταβολής.",
    ].join("\n")
    : [
      `Hello ${payload.customerFirstName},`,
      "",
      `Reference: ${payload.reference}`,
      ...categories.map((category) => category.text),
      `Pickup: ${pickupAt} — ${payload.pickupLocation}`,
      `Return: ${returnAt} — ${payload.returnLocation}`,
      `Total including 24% VAT: EUR ${payload.totalEur}`,
      `Deposit requested: EUR ${payload.depositEur}`,
      `Included mileage: ${payload.kilometresIncluded}`,
      "",
      "Included:",
      inclusionLines,
      "",
      "Selected extras:",
      extrasLines,
      "",
      `Pay the deposit: ${payload.paymentUrl}`,
      `ACR contact: ${phones}`,
      "",
      "This quote is not a confirmed booking. Confirmation follows payment of the deposit.",
    ].join("\n");
  const html = page(subject, `<p>${isGreek ? "Γεια σας" : "Hello"} ${escapeHtml(payload.customerFirstName)},</p>
    <p><strong>${isGreek ? "Αναφορά" : "Reference"}:</strong> ${escapeHtml(payload.reference)}</p>
    <ul>${categories.map((category) => category.html).join("")}</ul>
    <p><strong>${isGreek ? "Παραλαβή" : "Pickup"}:</strong> ${escapeHtml(pickupAt)} — ${escapeHtml(payload.pickupLocation)}<br>
    <strong>${isGreek ? "Επιστροφή" : "Return"}:</strong> ${escapeHtml(returnAt)} — ${escapeHtml(payload.returnLocation)}</p>
    <p><strong>${isGreek ? "Σύνολο με ΦΠΑ 24%" : "Total including 24% VAT"}:</strong> ${isGreek ? "€" : "EUR "}${escapeHtml(payload.totalEur)}<br>
    <strong>${isGreek ? "Προκαταβολή" : "Deposit requested"}:</strong> ${isGreek ? "€" : "EUR "}${escapeHtml(payload.depositEur)}<br>
    <strong>${isGreek ? "Χιλιόμετρα" : "Included mileage"}:</strong> ${escapeHtml(payload.kilometresIncluded)}</p>
    <h2>${isGreek ? "Περιλαμβάνονται" : "Included"}</h2>
    <ul>${payload.inclusions.map((item) => `<li>${escapeHtml(item)}</li>`).join("") || `<li>${escapeHtml(isGreek ? "Επικοινωνήστε με την ACR για επιβεβαίωση." : "Contact ACR to confirm." )}</li>`}</ul>
    <h2>${isGreek ? "Επιλεγμένα πρόσθετα" : "Selected extras"}</h2>
    <ul>${payload.extras.map((item) => `<li>${escapeHtml(item)}</li>`).join("") || `<li>${isGreek ? "Κανένα" : "None"}</li>`}</ul>
    <p><a href="${escapeHtml(payload.paymentUrl)}">${isGreek ? "Πληρώστε την προκαταβολή" : "Pay the deposit"}</a></p>
    <p>${isGreek ? "Επικοινωνία ACR" : "ACR contact"}: ${escapeHtml(phones)}</p>
    <p>${isGreek
      ? "Η προσφορά δεν αποτελεί επιβεβαιωμένη κράτηση. Η επιβεβαίωση ακολουθεί την πληρωμή της προκαταβολής."
      : "This quote is not a confirmed booking. Confirmation follows payment of the deposit."}</p>`);
  return { subject, text, html };
}
