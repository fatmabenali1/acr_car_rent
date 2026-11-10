import { createServer as createHttpServer } from "node:http";
import { EventEmitter } from "node:events";
import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";

const smtpPort = 1025;
const controlPort = 1026;
const stripePort = 12111;
const emails = [];
const emailEvents = new EventEmitter();
const stripeSessions = new Map();
const idempotentSessions = new Map();
let smtpServers = [];
let smtpStarted = false;
let stripeSessionCount = 0;

function sendJson(response, status, value) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}

function emailMatches(email, to, subjectContains) {
  return (!to || email.recipients.includes(to))
    && (!subjectContains || email.subject.includes(subjectContains));
}

function waitForEmail(to, subjectContains, timeout) {
  const found = emails.find((email) => emailMatches(email, to, subjectContains));
  if (found) return Promise.resolve(found);

  return new Promise((resolve) => {
    const listener = (email) => {
      if (!emailMatches(email, to, subjectContains)) return;
      cleanup();
      resolve(email);
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeout);
    const cleanup = () => {
      clearTimeout(timer);
      emailEvents.off("email", listener);
    };
    emailEvents.on("email", listener);
  });
}

function createSmtpServer() {
  return new SMTPServer({
    authOptional: true,
    disabledCommands: ["AUTH", "STARTTLS"],
    onData(stream, _session, callback) {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", callback);
      stream.on("end", async () => {
        try {
          const parsed = await simpleParser(Buffer.concat(chunks));
          const email = {
            subject: parsed.subject ?? "",
            recipients: (parsed.to?.value ?? []).map(({ address }) => address.toLowerCase()),
            text: parsed.text ?? "",
            html: typeof parsed.html === "string" ? parsed.html : "",
          };
          emails.push(email);
          emailEvents.emit("email", email);
          callback();
        } catch (error) {
          callback(error);
        }
      });
    },
  });
}

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.listen(port, host, onListening);
  });
}

async function startSmtp() {
  if (smtpStarted) return;
  const listeners = [
    { server: createSmtpServer(), host: "127.0.0.1" },
    { server: createSmtpServer(), host: "::1" },
  ];
  try {
    for (const { server, host } of listeners) {
      await listen(server, smtpPort, host);
    }
  } catch (error) {
    await Promise.all(listeners.map(({ server }) => new Promise((resolve) => {
      if (!server.listening) return resolve();
      server.close(() => resolve());
    })));
    throw error;
  }
  smtpServers = listeners.map(({ server }) => server);
  smtpStarted = true;
}

async function stopSmtp() {
  if (!smtpStarted) return;
  const servers = smtpServers;
  await Promise.all(servers.map((server) => new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  })));
  smtpServers = [];
  smtpStarted = false;
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function handleStripe(request, response, url) {
  if (url.pathname === "/__test/sessions" && request.method === "GET") {
    sendJson(response, 200, { count: stripeSessions.size, sessions: [...stripeSessions.values()] });
    return;
  }
  if (url.pathname === "/__test/reset" && request.method === "POST") {
    stripeSessions.clear();
    idempotentSessions.clear();
    stripeSessionCount = 0;
    sendJson(response, 200, { ok: true });
    return;
  }
  if (url.pathname === "/recaptcha/verify" && request.method === "POST") {
    const form = new URLSearchParams(await readBody(request));
    const valid = form.get("response") !== "e2e-invalid-token";
    sendJson(response, 200, {
      success: valid,
      score: valid ? 0.9 : 0,
      action: "quote_request",
      hostname: "localhost",
    });
    return;
  }
  if (url.pathname === "/v1/checkout/sessions" && request.method === "POST") {
    const form = new URLSearchParams(await readBody(request));
    const key = request.headers["idempotency-key"] ?? `session-${stripeSessionCount}`;
    const existingId = idempotentSessions.get(key);
    if (existingId) {
      sendJson(response, 200, stripeSessions.get(existingId));
      return;
    }

    stripeSessionCount += 1;
    const id = `cs_test_e2e_${stripeSessionCount}`;
    const amount = Number(form.get("line_items[0][price_data][unit_amount]"));
    const session = {
      id,
      object: "checkout.session",
      amount_subtotal: amount,
      amount_total: amount,
      currency: form.get("line_items[0][price_data][currency]") ?? "eur",
      customer_email: form.get("customer_email"),
      expires_at: Number(form.get("expires_at")),
      livemode: false,
      metadata: {
        booking_id: form.get("metadata[booking_id]"),
        reference: form.get("metadata[reference]"),
      },
      mode: "payment",
      payment_intent: `pi_test_e2e_${stripeSessionCount}`,
      payment_status: "unpaid",
      status: "open",
      url: `http://stripe-mock.invalid/checkout/${id}`,
    };
    stripeSessions.set(id, session);
    idempotentSessions.set(key, id);
    sendJson(response, 200, session);
    return;
  }
  const sessionMatch = url.pathname.match(/^\/v1\/checkout\/sessions\/([^/]+)$/);
  if (sessionMatch && request.method === "GET") {
    const session = stripeSessions.get(sessionMatch[1]);
    if (!session) {
      sendJson(response, 404, { error: { type: "invalid_request_error", message: "No such checkout session" } });
      return;
    }
    sendJson(response, 200, session);
    return;
  }
  sendJson(response, 404, { error: { message: "Unknown fake provider route" } });
}

export async function startFakeServices() {
  await startSmtp();

  const controlServer = createHttpServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://localhost:${controlPort}`);
    if (url.pathname === "/health") {
      sendJson(response, 200, { ok: true, smtpStarted });
      return;
    }
    if (url.pathname === "/messages" && request.method === "GET") {
      const to = url.searchParams.get("to")?.toLowerCase() ?? "";
      const subject = url.searchParams.get("subjectContains") ?? "";
      sendJson(response, 200, emails.filter((email) => emailMatches(email, to, subject)));
      return;
    }
    if (url.pathname === "/messages/wait" && request.method === "GET") {
      const email = await waitForEmail(
        url.searchParams.get("to")?.toLowerCase() ?? "",
        url.searchParams.get("subjectContains") ?? "",
        Math.min(Number(url.searchParams.get("timeout")) || 30_000, 60_000),
      );
      sendJson(response, email ? 200 : 408, email ?? { error: "email_timeout" });
      return;
    }
    if (url.pathname === "/messages/clear" && request.method === "POST") {
      emails.length = 0;
      sendJson(response, 200, { ok: true });
      return;
    }
    if (url.pathname === "/smtp/stop" && request.method === "POST") {
      await stopSmtp();
      sendJson(response, 200, { ok: true, smtpStarted });
      return;
    }
    if (url.pathname === "/smtp/start" && request.method === "POST") {
      await startSmtp();
      sendJson(response, 200, { ok: true, smtpStarted });
      return;
    }
    sendJson(response, 404, { error: "not_found" });
  });
  await listen(controlServer, controlPort, "127.0.0.1");

  const stripeServer = createHttpServer((request, response) => {
    void handleStripe(request, response, new URL(request.url ?? "/", `http://localhost:${stripePort}`))
      .catch((error) => sendJson(response, 500, { error: { message: error.message } }));
  });
  await listen(stripeServer, stripePort, "localhost");

  return {
    async close() {
      await stopSmtp();
      await Promise.all([controlServer, stripeServer].map((server) => new Promise((resolve) => server.close(resolve))));
    },
  };
}
