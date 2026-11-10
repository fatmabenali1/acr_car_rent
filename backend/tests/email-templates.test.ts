import assert from "node:assert/strict";
import test from "node:test";
import { renderDepositConfirmation } from "../src/services/email-templates/deposit-confirmation";
import { renderInternalDepositPaid } from "../src/services/email-templates/internal-deposit-paid";
import { renderQuoteOffer } from "../src/services/email-templates/quote-offer";

const quotePayload = {
  reference: "0203AC",
  customerFirstName: "Alex",
  vehicleCategories: [{
    code: "B",
    exampleModels: ["Fiat Panda"],
    cdwExcessEur: "800.00",
    cancellationNoticeDays: 7,
  }],
  pickupAt: "2027-07-12T10:00:00.000Z",
  returnAt: "2027-07-16T10:00:00.000Z",
  pickupLocation: "Athens Airport",
  returnLocation: "Athens Airport",
  totalEur: "420.00",
  depositEur: "100.00",
  kilometresIncluded: "Unlimited mileage",
  inclusions: ["Third-party liability insurance"],
  extras: ["GPS x1"],
  paymentUrl: "https://portal.example.test/pay?reservationReference=0203AC",
  agencyPhones: ["+30 210 6022220", "+30 210 6624887"],
};

test("quote offer templates include required quote, policy, and payment details in English and Greek", () => {
  const english = renderQuoteOffer(quotePayload, "en");
  assert.match(english.text, /0203AC/);
  assert.match(english.text, /Fiat Panda or similar/);
  assert.match(english.text, /including 24% VAT/);
  assert.match(english.text, /pre-authorized on the card at pickup; it is not charged/);
  assert.match(english.text, /at least 7 days before pickup/);
  assert.match(english.text, /https:\/\/portal\.example\.test\/pay\?reservationReference=0203AC/);
  assert.match(english.text, /\+30 210 6624887/);
  assert.match(english.html, /<a href=/);
  assert.match(english.html, /Fiat Panda/);

  const greek = renderQuoteOffer({
    ...quotePayload,
    vehicleCategories: [{
      ...quotePayload.vehicleCategories[0],
      exampleModels: ["Fiat Panda"],
    }],
  }, "el");
  assert.match(greek.text, /Η προσφορά/);
  assert.match(greek.text, /ή παρόμοιο/);
  assert.match(greek.text, /ΦΠΑ 24%/);
  assert.match(greek.html, /προεγκρίνεται/);
});

test("deposit confirmation and agency notification include safe details and both MIME bodies", () => {
  const customerPayload = {
    reference: "0203AC",
    customerFirstName: "Alex",
    amountPaidEur: "100.00",
    totalPaidEur: "100.00",
    balanceRemainingEur: "320.00",
    pickupAt: "2027-07-12T10:00:00.000Z",
    pickupLocation: "Athens Airport",
    agencyPhones: ["+30 210 6022220", "+30 210 6624887"],
    agencyEmail: "info@athenscarrental.com",
  };
  const english = renderDepositConfirmation(customerPayload, "en");
  assert.match(english.text, /Your deposit payment was successful and has been confirmed\./);
  assert.match(english.text, /EUR 100.00/);
  assert.match(english.text, /Balance due at vehicle delivery: EUR 320.00/);
  assert.match(english.text, /door no\. 3/);
  assert.match(english.text, /held for more than one year/);
  assert.match(english.text, /ACR phone: \+30 210 6022220 \/ \+30 210 6624887/);
  assert.match(english.text, /Email: info@athenscarrental\.com/);
  assert.match(english.html, /mailto:info@athenscarrental\.com/);
  assert.match(english.html, /<html\b/);

  const greek = renderDepositConfirmation(customerPayload, "el");
  assert.match(greek.text, /Δωρεάν μεταφορά/);
  assert.match(greek.html, /διεθνή άδεια/);

  const internal = renderInternalDepositPaid({
    reference: "0203AC",
    customerName: "Alex Driver",
    customerEmail: "alex@example.com",
    amountPaidEur: "100.00",
    totalPaidEur: "100.00",
    balanceRemainingEur: "320.00",
    pickupAt: "2027-07-12T10:00:00.000Z",
  }, "el");
  assert.match(internal.text, /Πληρώθηκε προκαταβολή/);
  assert.match(internal.html, /alex@example\.com/);
  assert.doesNotMatch(internal.text, /card number|CVV/i);
});
