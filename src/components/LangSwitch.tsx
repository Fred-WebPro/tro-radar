"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Lang } from "@/lib/i18n";

export default function LangSwitch({ lang }: { lang: Lang }) {
  const pathname = usePathname() ?? "/";
  const bare = pathname.startsWith("/ru") ? pathname.slice(3) || "/" : pathname;
  const enHref = bare;
  const ruHref = bare === "/" ? "/ru" : `/ru${bare}`;

  return (
    <span className="flex items-center gap-1.5 border-l border-rule pl-5 font-mono">
      <Link
        href={enHref}
        className={lang === "en" ? "text-ink underline underline-offset-4" : "text-ink-muted hover:text-ink"}
      >
        EN
      </Link>
      <span className="text-rule-strong">/</span>
      <Link
        href={ruHref}
        className={lang === "ru" ? "text-ink underline underline-offset-4" : "text-ink-muted hover:text-ink"}
      >
        RU
      </Link>
    </span>
  );
}
