"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", "/portal/new-password");
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: callback.toString(),
    });
    setBusy(false);
    if (error) {
      setMessage("The reset email could not be sent right now. Check the address and try again shortly.");
      return;
    }
    setSent(true);
    setMessage("If an account is registered with that email, a password reset link will be sent. Check your inbox for the secure link to choose a new password.");
  }

  return (
    <main className="admin-login">
      <form className="admin-panel" onSubmit={submit}>
        <p className="eyebrow">OVERSTOCK / SECURE PORTAL</p>
        <h1>RESET PASSWORD</h1>
        <p>Enter the email address linked to your portal account. We’ll email a secure password reset link.</p>
        {!sent && <label>
          Email
          <input type="email" name="email" placeholder="you@example.com" required autoComplete="email" />
        </label>}
        {!sent && <button className="admin-primary" disabled={busy}>{busy ? "SENDING…" : "SEND RESET LINK"}</button>}
        {message && <p className="portal-auth-message" role="status">{message}</p>}
        <Link className="portal-auth-link" href="/portal/login">BACK TO LOGIN</Link>
      </form>
    </main>
  );
}
