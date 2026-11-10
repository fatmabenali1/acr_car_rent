const controlBase = "http://127.0.0.1:1026";

export async function waitForEmail({ to, subjectContains, timeout = 30_000 }) {
  const url = new URL("/messages/wait", controlBase);
  if (to) url.searchParams.set("to", to);
  if (subjectContains) url.searchParams.set("subjectContains", subjectContains);
  url.searchParams.set("timeout", String(timeout));
  const response = await fetch(url);
  if (response.status === 408) {
    throw new Error(`Timed out waiting for email to ${to ?? "any recipient"} with subject ${subjectContains ?? "(any)"}.`);
  }
  if (!response.ok) throw new Error(`Fake SMTP inbox returned HTTP ${response.status}.`);
  return response.json();
}

export async function getEmails({ to, subjectContains } = {}) {
  const url = new URL("/messages", controlBase);
  if (to) url.searchParams.set("to", to);
  if (subjectContains) url.searchParams.set("subjectContains", subjectContains);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fake SMTP inbox returned HTTP ${response.status}.`);
  return response.json();
}

export async function clearEmails() {
  const response = await fetch(`${controlBase}/messages/clear`, { method: "POST" });
  if (!response.ok) throw new Error(`Could not clear fake SMTP inbox: HTTP ${response.status}.`);
}

export async function stopFakeSmtp() {
  const response = await fetch(`${controlBase}/smtp/stop`, { method: "POST" });
  if (!response.ok) throw new Error(`Could not stop fake SMTP: HTTP ${response.status}.`);
}

export async function startFakeSmtp() {
  const response = await fetch(`${controlBase}/smtp/start`, { method: "POST" });
  if (!response.ok) throw new Error(`Could not restart fake SMTP: HTTP ${response.status}.`);
}
