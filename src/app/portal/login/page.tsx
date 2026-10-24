"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function PortalLogin() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notice = params.get("error") === "link"
      ? "This secure link could not be verified. Request a new link and try again."
      : params.get("password") === "updated"
        ? "Your password has been updated. Sign in with your new password."
        : "";
    if (!notice) return;
    const timer = window.setTimeout(() => setMessage(notice), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email")).trim().toLowerCase();
    const password = String(values.get("password"));
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) {
      setMessage("The email or password was not recognized. Check your details and try again.");
      setBusy(false);
      return;
    }
    router.replace("/portal");
    router.refresh();
  }

  return (
    <main className="admin-login">
      <form className="admin-panel" onSubmit={submit}>
        <p className="eyebrow">OVERSTOCK / SECURE PORTAL</p>
        <h1>PORTAL LOGIN</h1>
        <label>
          Email
          <input type="email" name="email" placeholder="EMAIL ADDRESS" required autoComplete="email" />
        </label>
        <label>
          Password
          <input type="password" name="password" placeholder="ENTER YOUR PASSWORD" required autoComplete="current-password" />
        </label>
        <button className="admin-primary" disabled={busy}>
          {busy ? "SIGNING IN…" : "SIGN IN"}
        </button>
        <Link className="portal-auth-link" href="/portal/forgot-password">FORGOT PASSWORD?</Link>
        {message && <p className="admin-error" role="status">{message}</p>}
      </form>
    </main>
  );
}
