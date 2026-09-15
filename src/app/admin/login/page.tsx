"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLogin() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    const { error } = await createClient().auth.signInWithOtp({
      email: String(data.get("email")),
      options: { emailRedirectTo: `${window.location.origin}/admin`, shouldCreateUser: true },
    });
    if (error) { setMessage(error.message); setBusy(false); return; }
    setMessage("CHECK YOUR EMAIL FOR THE SECURE LOGIN LINK."); setBusy(false);
  }

  return <main className="admin-login"><form onSubmit={submit} className="admin-panel">
    <p className="eyebrow">OVERSTOCK COLLECTIVE / PRIVATE</p><h1>ADMIN LOGIN</h1>
    <label>Email<input name="email" type="email" required autoComplete="email" /></label>
    <button className="admin-primary" disabled={busy}>{busy ? "SENDING…" : "EMAIL LOGIN LINK"}</button>
    {message && <p role="alert" className="admin-error">{message}</p>}
  </form></main>;
}
