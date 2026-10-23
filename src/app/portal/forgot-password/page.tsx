"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email")).trim().toLowerCase();
    const response = await fetch("/api/portal/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(String(result.error || "The reset email could not be sent right now. Try again shortly."));
      return;
    }
    setSent(true);
    setMessage(String(result.message || "**If an account is registered with that email, a password reset link will be sent. Check your mail's INBOX or SPAM for the secure link to choose a new password.**"));
  }

  return (
    <main className="admin-login">
      <form className="admin-panel" onSubmit={submit}>
        <p className="eyebrow">OVERSTOCK / SECURE PORTAL</p>
        <h1>RESET PASSWORD</h1>
        <p>Enter your portal email to receive a secure reset link.</p>
        {!sent && <label>
          Email
          <input type="email" name="email" placeholder="you@example.com" required autoComplete="email" />
        </label>}
        {!sent && <button className="admin-primary" disabled={busy}>{busy ? "SENDING…" : "SEND RESET LINK"}</button>}
        {message && <p className={`portal-auth-message${sent ? " portal-reset-notice" : ""}`} role="status">{sent ? <strong>{message}</strong> : message}</p>}
        <Link className="portal-auth-link" href="/portal/login">BACK TO LOGIN</Link>
      </form>
    </main>
  );
}
