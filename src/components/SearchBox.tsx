"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { p, ui, type Lang } from "@/lib/i18n";

export default function SearchBox({
  lang = "en",
  initial = "",
  autoFocus = false,
}: {
  lang?: Lang;
  initial?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const t = ui[lang].search;

  return (
    <form
      className="flex w-full gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        if (query) router.push(p(lang, `/check?q=${encodeURIComponent(query)}`));
      }}
    >
      <input
        type="text"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.placeholder}
        className="min-w-0 flex-1 border border-rule-strong bg-surface px-4 py-3.5 text-base text-ink shadow-[inset_0_1px_2px_rgba(22,21,18,0.04)] placeholder:text-ink-muted focus:border-ink focus:outline-none"
        aria-label={t.aria}
      />
      <button
        type="submit"
        className="shrink-0 bg-ink px-6 py-3.5 text-sm font-medium uppercase tracking-[0.12em] text-page transition-colors hover:bg-ink/85"
      >
        {t.button}
      </button>
    </form>
  );
}
