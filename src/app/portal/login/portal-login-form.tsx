"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PortalMode = "login" | "register";

export default function PortalLoginForm({
  initialMode,
  invitationEmail,
}: {
  initialMode: PortalMode;
  invitationEmail: string;
}) {
  const router = useRouter();
  const mode = initialMode;
  const [email, setEmail] = useState(invitationEmail);
  const [inviteVerified, setInviteVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode !== "register" || !invitationEmail) return;
    let active = true;
    void createClient().auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      if (
        user?.email &&
        user.email.trim().toLowerCase() === invitationEmail
      ) {
        setInviteVerified(true);
      } else {
        setMessage("Open the secure link in your OVERSTOCK invitation email to confirm this address before setting your password.");
      }
    });
    return () => {
      active = false;
    };
  }, [invitationEmail, mode]);

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
      if (submittedEmail !== invitationEmail) {
        setMessage("Your invitation email is locked to this portal account.");
        return;
      }
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.email || user.email.trim().toLowerCase() !== invitationEmail) {
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
      const accessResponse = await fetch("/api/portal/complete-registration", {
        method: "POST",
      });
      if (!accessResponse.ok) {
        const result = await accessResponse.json().catch(() => ({}));
        setMessage(String(result.error || "Your password was saved, but portal access could not be activated. Contact OVERSTOCK."));
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

  return (
    <main className="admin-login">
      <form className="admin-panel" onSubmit={submit}>
        <p className="eyebrow">OVERSTOCK / SECURE PORTAL</p>
        <h1>{mode === "login" ? "PORTAL LOGIN" : "SET YOUR PORTAL PASSWORD"}</h1>
        {mode === "register" && (
          <p>
            Your OVERSTOCK invitation confirms the email below. Set and confirm
            your password to activate portal access.
          </p>
        )}
        <label>
          {mode === "register" ? "INVITED EMAIL (LOCKED)" : "Email"}
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            value={mode === "register" ? invitationEmail : email}
            readOnly={mode === "register"}
            aria-readonly={mode === "register"}
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
            : mode === "login" ? "SIGN IN" : "SET PASSWORD"}
        </button>
        {message && (
          <p className="admin-error" role="status">
            {message}
          </p>
        )}
      </form>
    </main>
  );
}
