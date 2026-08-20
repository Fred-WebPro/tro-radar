import Link from "next/link";
import type { CaseRow } from "@/lib/repo";

function shortCourt(court: string): string {
  return court
    .replace("District Court, ", "")
    .replace("Northern District of ", "N.D. ")
    .replace("Southern District of ", "S.D. ");
}

function Item({ c }: { c: CaseRow }) {
  return (
    <Link
      href={`/case/${c.docket_id}`}
      className="flex shrink-0 items-center gap-2 px-5 py-2 font-mono text-[11px] text-ink-2 transition-colors hover:text-ink"
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.date_terminated ? "bg-ink-muted" : "bg-critical"}`}
      />
      <span className="font-semibold text-ink">{c.brand}</span>
      <span>{shortCourt(c.court)}</span>
      <span className="text-ink-muted">{c.date_filed}</span>
    </Link>
  );
}

/** CSS-only news ticker of the latest filings. Pauses on hover. */
export default function Ticker({ cases }: { cases: CaseRow[] }) {
  if (cases.length === 0) return null;
  return (
    <div className="ticker relative flex items-stretch overflow-hidden border-y border-rule bg-surface">
      <div className="relative z-10 flex shrink-0 items-center gap-1.5 border-r border-rule bg-surface px-4 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-critical-ink">
        <span aria-hidden className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-critical opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-critical" />
        </span>
        Live filings
      </div>
      <div className="ticker-track">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex" aria-hidden={copy === 1}>
            {cases.map((c) => (
              <Item key={`${copy}-${c.docket_id}`} c={c} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
