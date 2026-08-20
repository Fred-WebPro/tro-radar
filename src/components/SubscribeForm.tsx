"use client";

import { useState } from "react";

export default function SubscribeForm({ query = "" }: { query?: string }) {
  const [email, setEmail] = useState("");
  const [watch, setWatch] = useState(query);
  const [state, setState] = useState<"idle" | "busy" | "ok" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, query: watch }),
      });
      setState(res.ok ? "ok" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "ok") {
    return (
      <p className="inline-flex items-center gap-2 border border-good/50 bg-good/5 px-4 py-3 text-sm text-good-ink">
        <span aria-hidden>✓</span>
        Watching “{watch}” — we’ll email you when a new matching case is filed.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-2 sm:flex-row">
      <input
        type="text"
        required
        value={watch}
        onChange={(e) => setWatch(e.target.value)}
        placeholder="Brand to watch"
        className="min-w-0 border border-rule-strong bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none sm:w-56"
        aria-label="Brand to watch"
      />
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@store.com"
        className="min-w-0 flex-1 border border-rule-strong bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
        aria-label="Email address"
      />
      <button
        type="submit"
        disabled={state === "busy"}
        className="shrink-0 bg-ink px-5 py-2.5 text-xs font-medium uppercase tracking-[0.12em] text-page transition-colors hover:bg-ink/85 disabled:opacity-50"
      >
        {state === "busy" ? "Saving…" : "Watch brand"}
      </button>
      {state === "error" && (
        <span className="self-center text-xs text-critical-ink" role="alert">
          Something went wrong — try again.
        </span>
      )}
    </form>
  );
}
