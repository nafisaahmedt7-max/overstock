"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="system-state">
      <p className="eyebrow">OVERSTOCK COLLECTIVE / NOTICE</p>
      <h1>SOMETHING DIDN&apos;T LOAD</h1>
      <p>Your information is safe. Check your connection and try again.</p>
      <button className="admin-primary" onClick={reset}>
        TRY AGAIN
      </button>
    </main>
  );
}
