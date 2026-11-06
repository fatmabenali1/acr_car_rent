export type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

export type EmailLanguage = "en" | "el";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatRentalDate(value: string, language: EmailLanguage): string {
  return new Date(value).toLocaleString(language === "el" ? "el-GR" : "en-GB", {
    timeZone: "Europe/Athens",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function page(subject: string, body: string): string {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.5;color:#20242a">
    <main style="max-width:680px;margin:0 auto;padding:24px">
      <h1 style="font-size:22px">${escapeHtml(subject)}</h1>${body}
      <p>Athens Car Rental</p>
    </main>
  </body></html>`;
}
