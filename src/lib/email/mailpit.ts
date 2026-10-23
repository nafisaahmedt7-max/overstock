type MailpitMessage = {
  From: { Email: string; Name?: string };
  To: Array<{ Email: string; Name?: string }>;
  Subject: string;
  Text?: string;
  HTML?: string;
};

/** Sends email to a local Mailpit instance. Call only from development routes. */
export async function sendToMailpit(message: MailpitMessage) {
  const baseUrl = (process.env.MAILPIT_URL || "http://127.0.0.1:8025").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/v1/send`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(`Mailpit rejected the message (HTTP ${response.status}).`);
  }
}

export function isLocalMailpitEnabled() {
  return process.env.NODE_ENV === "development" && process.env.EMAIL_PROVIDER === "mailpit";
}
