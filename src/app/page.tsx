import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import SubscribeForm from "@/components/SubscribeForm";
import TrendChart from "@/components/TrendChart";
import CaseList from "@/components/CaseList";
import { getStats, monthlyCounts, recentCases, topPlaintiffs } from "@/lib/repo";

export const dynamic = "force-dynamic";

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-5 py-5">
      <div className="font-display text-4xl font-medium tracking-tight">{value}</div>
      <div className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-2">
      {children}
    </h2>
  );
}

export default async function Home() {
  const [stats, months, recent, plaintiffs] = await Promise.all([
    getStats(),
    monthlyCounts(12),
    recentCases(6),
    topPlaintiffs(6),
  ]);
  const fmt = new Intl.NumberFormat("en-US");

  return (
    <div className="space-y-16 py-14">
      <section className="space-y-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
          Federal court monitoring · updated daily
        </p>
        <h1 className="max-w-3xl font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
          Know before you&nbsp;list.
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-ink-2">
          Every week, brands file <em>Schedule A</em> lawsuits against hundreds of online sellers at
          once — and sellers find out only when their PayPal or marketplace account is frozen. TRO
          Radar tracks these cases so you can check a brand{" "}
          <strong className="font-semibold text-ink">before</strong> you list the product.
        </p>
        <SearchBox autoFocus />
      </section>

      <section className="grid grid-cols-2 divide-x divide-rule border-y border-rule bg-surface sm:grid-cols-4">
        <StatCell value={fmt.format(stats.total)} label="cases tracked" />
        <StatCell value={fmt.format(stats.active)} label="active right now" />
        <StatCell value={fmt.format(stats.last30d)} label="filed last 30 days" />
        <StatCell value={fmt.format(stats.brands)} label="brands enforcing" />
      </section>

      <section className="space-y-4">
        <SectionHeading>Filing activity — last 12 months</SectionHeading>
        <div className="border-y border-rule bg-surface px-4 py-5">
          <TrendChart data={months} />
        </div>
      </section>

      <section className="grid gap-10 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <SectionHeading>Latest filings</SectionHeading>
            <Link href="/recent" className="text-sm text-link hover:underline">
              View all →
            </Link>
          </div>
          <CaseList cases={recent} />
        </div>
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <SectionHeading>Most litigious brands</SectionHeading>
            <Link href="/plaintiffs" className="text-sm text-link hover:underline">
              Full list →
            </Link>
          </div>
          <ul className="divide-y divide-rule border-y border-rule bg-surface">
            {plaintiffs.map((p, i) => (
              <li key={p.brand_norm}>
                <Link
                  href={`/check?q=${encodeURIComponent(p.brand)}`}
                  className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-page"
                >
                  <span className="w-5 shrink-0 font-display text-lg text-ink-muted">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{p.brand}</span>
                  <span className="shrink-0 font-mono text-[11px] text-ink-muted">
                    {p.total} cases · <span className="text-critical-ink">{p.active} active</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeading>How it works</SectionHeading>
        <ol className="grid gap-x-8 gap-y-6 sm:grid-cols-3">
          {[
            {
              t: "Search the brand",
              d: "Type the brand on the product you're about to source — from AliExpress, Temu, 1688, or anywhere else.",
            },
            {
              t: "Read the verdict",
              d: "We match it against every Schedule A case in our database, built from public federal court records.",
            },
            {
              t: "Watch it",
              d: "Subscribe to a brand and get an email the moment a new case is filed — before the freeze orders go out.",
            },
          ].map((s, i) => (
            <li key={s.t} className="border-t-2 border-ink pt-4">
              <div className="font-display text-2xl text-ink-muted">0{i + 1}</div>
              <div className="mb-1.5 mt-2 font-medium">{s.t}</div>
              <div className="text-sm leading-relaxed text-ink-2">{s.d}</div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3 border-2 border-ink bg-surface p-7">
        <SectionHeading>Get alerts for a brand</SectionHeading>
        <p className="text-sm text-ink-2">
          Weekly digest of new Schedule A filings that match your watchlist.
        </p>
        <SubscribeForm />
      </section>
    </div>
  );
}
