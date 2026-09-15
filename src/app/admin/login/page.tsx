"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLogin() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(data.get("email")),
      password: String(data.get("password")),
    });
    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="admin-login">
      <form onSubmit={submit} className="admin-panel">
        <p className="eyebrow">OVERSTOCK / PRIVATE</p>
        <h1>ADMIN LOGIN</h1>
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
          />
        </label>
        <button className="admin-primary" disabled={busy}>
          {busy ? "SIGNING IN…" : "SIGN IN"}
        </button>
        {message && (
          <p role="alert" className="admin-error">
            {message}
          </p>
        )}
      </form>
    </main>
  );
}
