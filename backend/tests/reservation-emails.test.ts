import assert from "node:assert/strict";
import test from "node:test";
import { env, smtpConfigured } from "../src/config/env";
import {
  configureReservationEmailTransportForTests,
  createReservationEmailMessages,
  sendReservationEmails,
  type ReservationEmailData,
} from "../src/services/reservation-emails";

const reservation: ReservationEmailData = {
  reference: "0203AC",
  firstName: `A <b>"O'Neil"</b>`,
  lastName: "Tester",
  email: "fictional@example.invalid",
  phone: "+30123456789",
  country: "GR",
  categoryCode: "D1",
  categoryName: "Category D1",
  exampleModels: ["Skoda Scala"],
  driverAge: 30,
  driverLicenceYears: 8,
  coupon: "",
  pickupLocation: "Athens Airport",
  returnLocation: "Athens Airport",
  pickupAt: "2027-01-10T09:00:00.000Z",
  returnAt: "2027-01-12T09:00:00.000Z",
  days: 2,
  total: 50,
  deposit: 50,
  notes: `<script>alert("x")</script>`,
  language: "en",
};

test("reservation emails contain customer/agency recipients, quote values, safe HTML and payment URL", () => {
  const messages = createReservationEmailMessages(reservation);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].to, reservation.email);
  assert.equal(messages[1].to, env.MAIL_AGENCY_TO ?? env.MAIL_TO_AGENCY ?? env.AGENCY_EMAIL);
  assert.equal(messages[0].subject, "Your Athens Car Rental reservation request [0203AC]");
  assert.match(messages[0].text, /EUR 50\.00/);
  assert.match(messages[0].text, /\/pay\?ref=0203AC/);
  assert.match(messages[0].html, /&lt;b&gt;&quot;O&#39;Neil&quot;&lt;\/b&gt;/);
  assert.doesNotMatch(messages[0].html, /<b>|<script>/);
  assert.match(messages[1].html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.match(messages[1].text, /Notes: <script>/);
});

test("sendReservationEmails sends exactly two messages and retries failed sends three times", async () => {
  const delivered: Array<{ to: string }> = [];
  let attempts = 0;
  const emailSent = await sendReservationEmails(reservation, {
    async sendMail(message) {
      attempts += 1;
      if (attempts === 1 || attempts === 2) throw Object.assign(new Error("simulated"), { code: "ETIMEDOUT" });
      delivered.push({ to: String(message.to) });
      return {} as never;
    },
  });
  assert.equal(emailSent, true);
  assert.equal(attempts, 4);
  assert.deepEqual(delivered.map((message) => message.to), [
    reservation.email,
    env.MAIL_AGENCY_TO ?? env.MAIL_TO_AGENCY ?? env.AGENCY_EMAIL,
  ]);
});

test("email delivery failure reports false after three attempts without throwing", async () => {
  let attempts = 0;
  const emailSent = await sendReservationEmails(reservation, {
    async sendMail() {
      attempts += 1;
      throw Object.assign(new Error("simulated"), { code: "ECONNECTION" });
    },
  });
  assert.equal(emailSent, false);
  assert.equal(attempts, 6);
});

test("development JSON transport does not report emails as externally delivered", {
  skip: smtpConfigured,
}, async () => {
  configureReservationEmailTransportForTests(null);
  assert.equal(await sendReservationEmails(reservation), false);
});
