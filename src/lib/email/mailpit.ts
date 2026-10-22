type LocalEmail = {
  fromEmail: string;
  fromName: string;
  toEmail: string;
  toName?: string;
  subject: string;
  text: string;
  html: string;
};

/**
 * Captures mail in a local Mailpit instance. This transport is intentionally
 * development-only so a misconfigured preview or production environment can
 * never route email to localhost.
 */
export async function sendToLocalMailpit(message: LocalEmail) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Mailpit email delivery is available only in local development.");
  }

  const mailpitUrl = process.env.MAILPIT_URL || "http://127.0.0.1:8025";
  return fetch(new URL("/api/v1/send", mailpitUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      From: { Email: message.fromEmail, Name: message.fromName },
      To: [{ Email: message.toEmail, Name: message.toName || message.toEmail }],
      Subject: message.subject,
      Text: message.text,
      HTML: message.html,
    }),
  });
}
