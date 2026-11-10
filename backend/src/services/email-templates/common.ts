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
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:24px 12px;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111111">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse">
        <tr><td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;background-color:#ffffff">
            <tr><td style="padding:20px 24px;background-color:#111111;border-bottom:5px solid #FACC15">
              <h1 style="margin:0;font-size:22px;line-height:1.3;color:#FACC15">${escapeHtml(subject)}</h1>
            </td></tr>
            <tr><td style="padding:24px">${body}</td></tr>
            <tr><td style="padding:16px 24px;background-color:#111111;color:#ffffff;font-size:14px">Athens Car Rental</td></tr>
          </table>
        </td></tr>
      </table>
    </body>
  </html>`;
}
