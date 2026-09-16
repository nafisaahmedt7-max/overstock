"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
export default function PortalLogin() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    if (!error) {
      router.replace("/portal");
      router.refresh();
      return;
    }
    setMessage(error.message);
    setBusy(false);
  }
  return (
    <main className="admin-login">
      <form className="admin-panel" onSubmit={submit}>
        <p className="eyebrow">OVERSTOCK / SECURE PORTAL</p>
        <h1>PORTAL LOGIN</h1>
        <label>
          Email
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="current-password"
          />
        </label>
        <button className="admin-primary" disabled={busy}>
          {busy ? "SIGNING IN…" : "SIGN IN"}
        </button>
        {message && (
          <p className="admin-error" role="status">
            {message}
          </p>
        )}
        <Link className="portal-register-link" href="/portal/register">REGISTER</Link>
      </form>
    </main>
  );
}
