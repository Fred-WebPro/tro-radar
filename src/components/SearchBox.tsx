"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBox({ initial = "", autoFocus = false }: { initial?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  return (
    <form
      className="flex w-full gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        if (query) router.push(`/check?q=${encodeURIComponent(query)}`);
      }}
    >
      <input
        type="text"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        placeholder='Brand or product name — “Harley-Davidson”, “Paddington plush”…'
        className="min-w-0 flex-1 border border-rule-strong bg-surface px-4 py-3.5 text-base text-ink shadow-[inset_0_1px_2px_rgba(22,21,18,0.04)] placeholder:text-ink-muted focus:border-ink focus:outline-none"
        aria-label="Brand or product name to check"
      />
      <button
        type="submit"
        className="shrink-0 bg-ink px-6 py-3.5 text-sm font-medium uppercase tracking-[0.12em] text-page transition-colors hover:bg-ink/85"
      >
        Check
      </button>
    </form>
  );
}
