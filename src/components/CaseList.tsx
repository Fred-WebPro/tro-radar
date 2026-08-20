import Link from "next/link";
import type { CaseRow } from "@/lib/repo";
import StatusBadge from "./StatusBadge";

function relative(date: string): string | null {
  const days = Math.floor((Date.now() - new Date(date + "T12:00:00Z").getTime()) / 86_400_000);
  if (days < 0 || days > 7) return null;
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export default function CaseList({ cases }: { cases: CaseRow[] }) {
  if (cases.length === 0) return null;
  return (
    <ul className="divide-y divide-rule border-y border-rule bg-surface">
      {cases.map((c) => {
        const rel = relative(c.date_filed);
        return (
          <li key={c.docket_id}>
            <Link
              href={`/case/${c.docket_id}`}
              className="flex flex-col gap-1 px-4 py-3.5 transition-colors hover:bg-page"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 truncate text-[15px] font-medium text-ink">{c.brand}</span>
                <StatusBadge terminated={c.date_terminated} />
              </div>
              <span className="truncate text-[13px] text-ink-2">{c.case_name}</span>
              <span className="flex flex-wrap gap-x-3 font-mono text-[11px] text-ink-muted">
                <span>{c.court}</span>
                {c.docket_number && <span>{c.docket_number}</span>}
                <span>
                  Filed {c.date_filed}
                  {rel && <span className="text-critical-ink"> · {rel}</span>}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
