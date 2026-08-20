import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import SubscribeForm from "@/components/SubscribeForm";
import CaseList from "@/components/CaseList";
import { searchCases, groupByBrand } from "@/lib/repo";
import { assessRisk, type Verdict } from "@/lib/risk";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q = "" } = await searchParams;
  const query = q.trim();
  if (!query) return { title: "Risk check" };
  return {
    title: `Is “${query}” safe to sell? Schedule A lawsuit check`,
    description: `Check whether “${query}” is involved in active Schedule A / TRO trademark lawsuits against online sellers, based on federal court records.`,
  };
}

const VERDICT_STYLE: Record<
  Verdict,
  { border: string; bg: string; text: string; icon: string; label: string }
> = {
  red: {
    border: "border-critical",
    bg: "bg-critical/5",
    text: "text-critical-ink",
    icon: "⚠",
    label: "High risk",
  },
  yellow: {
    border: "border-warn",
    bg: "bg-warn/10",
    text: "text-warn-ink",
    icon: "◆",
    label: "Caution",
  },
  green: {
    border: "border-good",
    bg: "bg-good/5",
    text: "text-good-ink",
    icon: "✓",
    label: "No matches",
  },
};

export default async function CheckPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const matches = query ? await searchCases(query) : [];
  const groups = groupByBrand(matches);
  const risk = assessRisk(matches, groups);
  const style = VERDICT_STYLE[risk.verdict];

  return (
    <div className="space-y-10 py-12">
      <SearchBox key={query} initial={query} />

      {query === "" ? (
        <div className="max-w-2xl space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-medium tracking-tight">
              Check a product before you list it
            </h1>
            <p className="leading-relaxed text-ink-2">
              Type the <strong className="text-ink">brand on the product</strong> (or paste the
              whole listing title) — we match it against every Schedule A lawsuit filed since
              2018.
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              Try an example
            </p>
            <div className="flex flex-wrap gap-2">
              {["Harley-Davidson", "Sony PlayStation controller", "Paddington plush", "generic silicone spatula"].map((s) => (
                <Link
                  key={s}
                  href={`/check?q=${encodeURIComponent(s)}`}
                  className="border border-rule-strong bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-ink"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
          <p className="text-sm text-ink-muted">
            First time here? Read the{" "}
            <Link href="/guide" className="text-link hover:underline">
              3-minute guide
            </Link>{" "}
            — what these lawsuits are and how to read the verdict.
          </p>
        </div>
      ) : (
        <>
          <section className={`border-2 ${style.border} ${style.bg} p-7`} aria-live="polite">
            <div
              className={`mb-3 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.16em] ${style.text}`}
            >
              <span aria-hidden>{style.icon}</span>
              {style.label}
            </div>
            <h1 className="font-display text-3xl font-medium leading-tight tracking-tight">
              {risk.headline}
            </h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-ink-2">{risk.detail}</p>
            {risk.lastFiled && (
              <p className="mt-3 font-mono text-xs text-ink-muted">
                Most recent matching filing: {risk.lastFiled}
              </p>
            )}
            <p className="mt-3 text-xs">
              <Link href="/guide#verdicts" className="text-link hover:underline">
                How to read this verdict →
              </Link>
            </p>
          </section>

          {groups.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-2">
                Matched brands
              </h2>
              <div className="flex flex-wrap gap-2">
                {groups.slice(0, 12).map((g) => (
                  <Link
                    key={g.brand_norm}
                    href={`/check?q=${encodeURIComponent(g.brand)}`}
                    className="border border-rule-strong bg-surface px-3 py-1.5 text-sm transition-colors hover:border-ink"
                  >
                    <span className="font-medium">{g.brand}</span>{" "}
                    <span className="text-ink-muted">
                      {g.total} case{g.total === 1 ? "" : "s"}
                      {g.active > 0 && (
                        <span className="text-critical-ink"> · {g.active} active</span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {matches.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-2">
                Matching cases ({matches.length}
                {matches.length >= 60 ? "+" : ""})
              </h2>
              <CaseList cases={matches.slice(0, 30)} />
            </section>
          )}

          <section className="space-y-3 border-2 border-ink bg-surface p-7">
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-2">
              Watch “{query}”
            </h2>
            <p className="text-sm text-ink-2">
              Get an email when a new Schedule A case matching this search is filed.
            </p>
            <SubscribeForm key={query} query={query} />
          </section>
        </>
      )}
    </div>
  );
}
