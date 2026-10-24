"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const SUPPORTED_PASSWORD_SYMBOLS = "!@#$%^&*()_+-=[]{};\':\"|<>?,./`~";

function meetsPasswordRequirements(password: string) {
  return password.length >= 8
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /[0-9]/.test(password)
    && [...password].some((character) => SUPPORTED_PASSWORD_SYMBOLS.includes(character));
}

export default function NewPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isInvitation, setIsInvitation] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const expectedEmail = params.get("email")?.trim().toLowerCase() || "";
    const invitation = params.get("mode") === "register";

    void createClient().auth.getUser().then(({ data: { user }, error }) => {
      if (!active) return;
      setIsInvitation(invitation);
      const actualEmail = user?.email?.trim().toLowerCase() || "";
      if (error || !user || !actualEmail || (expectedEmail && expectedEmail !== actualEmail)) {
        setMessage("This secure link is invalid or has expired. Request a new link and try again.");
        setReady(false);
        return;
      }
      setEmail(actualEmail);
      setReady(true);
    });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const values = new FormData(event.currentTarget);
    const password = String(values.get("password"));
    const confirmation = String(values.get("confirmPassword"));
    if (!meetsPasswordRequirements(password)) {
      setMessage("Use at least 8 characters with an uppercase letter, a lowercase letter, a number, and a supported symbol.");
      setBusy(false);
      return;
    }
    if (password !== confirmation) {
      setMessage("Your passwords do not match.");
      setBusy(false);
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    if (isInvitation) {
      const response = await fetch("/api/portal/complete-registration", { method: "POST" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setMessage(String(result.error || "Your password was saved, but portal access could not be activated. Contact OVERSTOCK."));
        setBusy(false);
        return;
      }
      router.replace("/portal");
      router.refresh();
      return;
    }

    await supabase.auth.signOut();
    router.replace("/portal/login?password=updated");
    router.refresh();
  }

  return (
    <main className="admin-login">
      <form className="admin-panel" onSubmit={submit}>
        <p className="eyebrow">OVERSTOCK / SECURE PORTAL</p>
        <h1>{isInvitation ? "SET YOUR PASSWORD" : "NEW PASSWORD"}</h1>
        {email && <label>
          Account email
          <input type="email" value={email} readOnly autoComplete="username" aria-readonly="true" placeholder="ACCOUNT EMAIL" />
        </label>}
        {ready && <>
          <p className="portal-password-guidance"><strong>PASSWORD REQUIREMENTS</strong><br />Use at least 8 characters, including an uppercase letter, a lowercase letter, a number, and a symbol. Examples: ! @ # $ % ^ &amp; *</p>
          <label>
            New password
            <input type="password" name="password" required minLength={8} autoComplete="new-password" placeholder="ENTER NEW PASSWORD" />
          </label>
          <label>
            Confirm password
            <input type="password" name="confirmPassword" required minLength={8} autoComplete="new-password" placeholder="CONFIRM NEW PASSWORD" />
          </label>
          <button className="admin-primary" disabled={busy}>{busy ? "SAVING…" : "SAVE PASSWORD"}</button>
        </>}
        {message && <p className="admin-error" role="status">{message}</p>}
        {!ready && <Link className="portal-auth-link" href="/portal/forgot-password">REQUEST A NEW LINK</Link>}
      </form>
    </main>
  );
}
