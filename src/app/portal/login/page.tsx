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
  const [inviteVerified, setInviteVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invitationEmail = params.get("email")?.trim().toLowerCase() || "";
    if (params.get("mode") !== "register") return;

    setMode("register");
    if (invitationEmail) {
      setEmail(invitationEmail);
      setInvitedEmail(invitationEmail);
    }

    void createClient().auth.getUser().then(({ data: { user } }) => {
      if (
        user?.email &&
        invitationEmail &&
        user.email.trim().toLowerCase() === invitationEmail
      ) {
        setInviteVerified(true);
      } else {
        setMessage("Open the secure link in your OVERSTOCK invitation email to confirm this address before creating your password.");
      }
    });
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const values = new FormData(e.currentTarget);
    const submittedEmail = String(values.get("email")).trim().toLowerCase();
    const password = String(values.get("password"));

    if (mode === "register") {
      if (!inviteVerified) {
        setMessage("Open the secure registration link in your OVERSTOCK invitation first.");
        return;
      }
      if (password !== String(values.get("confirmPassword"))) {
        setMessage("Your passwords do not match.");
        return;
      }
      if (invitedEmail && submittedEmail !== invitedEmail) {
        setMessage("Register using the exact email address from your invitation.");
        return;
      }
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.email || user.email.trim().toLowerCase() !== submittedEmail) {
        setInviteVerified(false);
        setMessage("Your invitation session is missing or expired. Open the secure link in your invitation email again.");
        return;
      }
      setBusy(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(error.message);
        setBusy(false);
        return;
      }
      router.replace("/portal");
      router.refresh();
      return;
    }

    setBusy(true);
    const { error } = await createClient().auth.signInWithPassword({
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
    if (nextMode === "login") {
      setInvitedEmail("");
      setInviteVerified(false);
    } else {
      setInviteVerified(false);
      setMessage("Use the secure registration link in your OVERSTOCK invitation to confirm your email first.");
    }
  }

  return (
    <main className="admin-login">
      <form className="admin-panel" onSubmit={submit}>
        <p className="eyebrow">OVERSTOCK / SECURE PORTAL</p>
        <h1>{mode === "login" ? "PORTAL LOGIN" : "CREATE PORTAL ACCOUNT"}</h1>
        {mode === "register" && (
          <p>
            Register with the exact email approved by OVERSTOCK. Your invitation
            link confirms this email before you set your password.
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
        <button className="admin-primary" disabled={busy || (mode === "register" && !inviteVerified)}>
          {busy
            ? mode === "login" ? "SIGNING IN…" : "SETTING PASSWORD…"
            : mode === "login" ? "SIGN IN" : "REGISTER"}
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
