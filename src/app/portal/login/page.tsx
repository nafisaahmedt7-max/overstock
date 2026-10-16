"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PortalMode = "login" | "register";

export default function PortalLogin() {
  const router = useRouter();
  const [mode, setMode] = useState<PortalMode>("login");
  const [email, setEmail] = useState("");
  const [invitedEmail, setInvitedEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invitationEmail = params.get("email")?.trim().toLowerCase() || "";
    if (params.get("mode") === "register") {
      setMode("register");
      if (invitationEmail) {
        setEmail(invitationEmail);
        setInvitedEmail(invitationEmail);
      }
    }
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const form = e.currentTarget;
    const values = new FormData(form);
    const submittedEmail = String(values.get("email")).trim().toLowerCase();
    const password = String(values.get("password"));

    if (mode === "register") {
      if (password !== String(values.get("confirmPassword"))) {
        setMessage("Your passwords do not match.");
        return;
      }
      if (invitedEmail && submittedEmail !== invitedEmail) {
        setMessage("Register using the exact email address from your invitation.");
        return;
      }
    }

    setBusy(true);
    const supabase = createClient();
    if (mode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email: submittedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Fportal`,
        },
      });
      if (error) {
        setMessage(error.message);
        setBusy(false);
        return;
      }
      if (data.session) {
        router.replace("/portal");
        router.refresh();
        return;
      }
      setMessage("Account started. Check your inbox for the confirmation email, then sign in with this email.");
      setBusy(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: submittedEmail,
      password,
    });
    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }
    router.replace("/portal");
    router.refresh();
  }

  function changeMode(nextMode: PortalMode) {
    setMode(nextMode);
    setMessage("");
    if (nextMode === "login") setInvitedEmail("");
  }

  return (
    <main className="admin-login">
      <form className="admin-panel" onSubmit={submit}>
        <p className="eyebrow">OVERSTOCK / SECURE PORTAL</p>
        <h1>{mode === "login" ? "PORTAL LOGIN" : "CREATE PORTAL ACCOUNT"}</h1>
        {mode === "register" && (
          <p>
            Register with the exact email approved by OVERSTOCK. We’ll send a
            confirmation email after you submit your password.
          </p>
        )}
        <label>
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            value={email}
            readOnly={mode === "register" && Boolean(invitedEmail)}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
          />
        </label>
        {mode === "register" && (
          <label>
            Confirm password
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
        )}
        <button className="admin-primary" disabled={busy}>
          {busy
            ? mode === "login" ? "SIGNING IN…" : "CREATING ACCOUNT…"
            : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
        </button>
        {message && (
          <p className="admin-error" role="status">
            {message}
          </p>
        )}
        <button
          type="button"
          className="portal-register-link portal-mode-toggle"
          onClick={() => changeMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "CREATE AN ACCOUNT" : "BACK TO SIGN IN"}
        </button>
      </form>
    </main>
  );
}
