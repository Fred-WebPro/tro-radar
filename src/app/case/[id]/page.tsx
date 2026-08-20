import Link from "next/link";
import { notFound } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import CaseList from "@/components/CaseList";
import { getCase, casesByBrandNorm } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const docketId = Number(id);
  if (!Number.isInteger(docketId)) notFound();
  const c = await getCase(docketId);
  if (!c) notFound();

  const related = (await casesByBrandNorm(c.brand_norm)).filter(
    (r) => r.docket_id !== c.docket_id
  );
  const parties: string[] = c.parties ? JSON.parse(c.parties) : [];

  return (
    <div className="space-y-10 py-12">
      <div>
        <Link href={`/check?q=${encodeURIComponent(c.brand)}`} className="text-sm text-link hover:underline">
          ← All “{c.brand}” cases
        </Link>
      </div>

      <header className="space-y-4">
        <StatusBadge terminated={c.date_terminated} />
        <h1 className="font-display text-3xl font-medium leading-snug tracking-tight">
          {c.case_name}
        </h1>
      </header>

      <dl className="grid gap-x-8 gap-y-5 border-y border-rule bg-surface p-6 sm:grid-cols-2">
        {[
          ["Plaintiff", c.plaintiff],
          ["Court", c.court],
          ["Docket number", c.docket_number ?? "—"],
          ["Date filed", c.date_filed],
          ["Date terminated", c.date_terminated ?? "— (case is open)"],
          ["PACER case ID", c.pacer_case_id ?? "—"],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">{k}</dt>
            <dd className="mt-1 text-sm">{v}</dd>
          </div>
        ))}
      </dl>

      {parties.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-2">
            Parties
          </h2>
          <ul className="space-y-1 text-sm text-ink-2">
            {parties.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      )}

      <a
        href={c.absolute_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-ink px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-page transition-colors hover:bg-ink/85"
      >
        View full docket on CourtListener ↗
      </a>

      {related.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-2">
            Other cases by {c.brand} ({related.length})
          </h2>
          <CaseList cases={related.slice(0, 15)} />
        </section>
      )}
    </div>
  );
}
