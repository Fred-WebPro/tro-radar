import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to use TRO Radar",
  description:
    "A 3-minute guide: what Schedule A lawsuits are, how to check a product before listing it, how to read the red / yellow / green verdict, and how to get alerts.",
};

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-2">
      {children}
    </h2>
  );
}

const SAMPLES = [
  { q: "Harley-Davidson", note: "active enforcement" },
  { q: "Sony PlayStation controller", note: "full product title works too" },
  { q: "Paddington plush", note: "character brands sue a lot" },
  { q: "generic silicone spatula", note: "a clean result" },
];

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-14 py-12">
      <header className="space-y-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
          3-minute guide
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight">How to use TRO Radar</h1>
        <p className="text-lg leading-relaxed text-ink-2">
          One habit protects your store: <strong className="text-ink">check the brand before you
          list the product</strong>. Here is exactly how, and how to read what you see.
        </p>
      </header>

      <section className="space-y-4">
        <H2 id="schedule-a">1 · What is a “Schedule A” lawsuit?</H2>
        <p className="leading-relaxed text-ink-2">
          A brand files <em>one</em> federal case against hundreds of online sellers at once. The
          list of defendants — “Schedule A” — is <strong className="text-ink">sealed</strong>, so
          sellers don’t know they’ve been sued. The court then issues a restraining order (TRO),
          and PayPal, Amazon, eBay, Etsy, Shopify and payment processors freeze every listed
          seller’s funds. That freeze is usually the first time a seller hears about the case.
        </p>
        <p className="leading-relaxed text-ink-2">
          The one thing that <em>is</em> public from day one: <strong className="text-ink">who
          filed, and when</strong>. TRO Radar reads every filing daily and turns it into a simple
          verdict.
        </p>
      </section>

      <section className="space-y-4">
        <H2 id="check">2 · Check a product (10 seconds)</H2>
        <ol className="list-decimal space-y-3 pl-5 leading-relaxed text-ink-2">
          <li>
            Open the supplier listing (AliExpress, Temu, 1688, anywhere) and identify the{" "}
            <strong className="text-ink">brand on the product itself</strong> — the name or logo on
            the item, the franchise or character it resembles. Not the supplier’s store name.
          </li>
          <li>
            Type it into the search on the{" "}
            <Link href="/" className="text-link hover:underline">home page</Link>. Pasting the whole
            product title also works — we match every word against the case database.
          </li>
          <li>Read the verdict. That’s it.</li>
        </ol>
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            Try these
          </p>
          <div className="flex flex-wrap gap-2">
            {SAMPLES.map((s) => (
              <Link
                key={s.q}
                href={`/check?q=${encodeURIComponent(s.q)}`}
                className="border border-rule-strong bg-surface px-3 py-1.5 text-sm transition-colors hover:border-ink"
              >
                <span className="font-medium">{s.q}</span>{" "}
                <span className="text-ink-muted">— {s.note}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <H2 id="verdicts">3 · Reading the verdict</H2>
        <div className="space-y-3">
          <div className="border-2 border-critical bg-critical/5 p-5">
            <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-critical-ink">
              ⚠ High risk
            </p>
            <p className="text-sm leading-relaxed text-ink-2">
              The matched brand has <strong className="text-ink">open cases right now</strong> —
              sellers of matching products are being added to sealed defendant lists as you read
              this. <strong className="text-ink">Don’t list the product.</strong> If you already
              sell it, consider delisting and withdrawing your balance before a freeze can land.
            </p>
          </div>
          <div className="border-2 border-warn bg-warn/10 p-5">
            <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-warn-ink">
              ◆ Caution
            </p>
            <p className="text-sm leading-relaxed text-ink-2">
              All matching cases are closed, but the brand has sued sellers before and knows the
              playbook. Fine for <em>unbranded</em> goods in the same niche; risky for anything
              carrying their name, logo, characters, or signature design. Open the case list and
              check how recently and how often they filed.
            </p>
          </div>
          <div className="border-2 border-good bg-good/5 p-5">
            <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-good-ink">
              ✓ No matches
            </p>
            <p className="text-sm leading-relaxed text-ink-2">
              Nothing in ~11,000 cases since 2018 matches your search.{" "}
              <strong className="text-ink">Not a guarantee</strong>: brands can file tomorrow, and
              design-patent suits sometimes carry no recognizable brand name. It is a real signal —
              just not immunity.
            </p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-ink-muted">
          Under every verdict you’ll see <em>which</em> brands matched and the full case list —
          each case links to the original federal docket on CourtListener, so you can verify
          everything yourself.
        </p>
      </section>

      <section className="space-y-4">
        <H2 id="watchlist">4 · Watch a brand</H2>
        <p className="leading-relaxed text-ink-2">
          Selling in a risky niche (auto parts, plush, phone accessories, fan merch)? Enter the
          brand and your email in the <strong className="text-ink">“Watch this brand”</strong> box
          on any result page. The day a new matching case is filed, you get an email — typically
          days or weeks before freeze orders reach the platforms. Every email has a one-click
          unsubscribe.
        </p>
      </section>

      <section className="space-y-4">
        <H2 id="extension">5 · Chrome extension</H2>
        <p className="leading-relaxed text-ink-2">
          The extension shows the verdict automatically on{" "}
          <strong className="text-ink">AliExpress, Temu, 1688 and Alibaba</strong> product pages — a
          small card appears in the corner while you browse, no copy-pasting. Click the extension
          icon for a manual check of any name.
        </p>
        <p className="text-sm leading-relaxed text-ink-muted">
          Install: download the{" "}
          <a
            href="https://github.com/Fred-WebPro/tro-radar/tree/main/extension"
            target="_blank"
            rel="noopener noreferrer"
            className="text-link hover:underline"
          >
            extension folder
          </a>{" "}
          → open <span className="font-mono">chrome://extensions</span> → enable Developer mode →
          “Load unpacked” → select the folder.
        </p>
      </section>

      <section className="space-y-4">
        <H2 id="api">6 · API for your own tools</H2>
        <p className="leading-relaxed text-ink-2">
          Everything above is available as JSON — free, no key:
        </p>
        <pre className="overflow-x-auto border border-rule bg-surface px-4 py-3 font-mono text-xs text-ink-2">
{`GET https://tro-radar.vercel.app/api/check?q=harley+davidson

{ "verdict": "red", "active_cases": 31, "brands": [...], "cases": [...] }`}
        </pre>
      </section>

      <section className="space-y-4">
        <H2 id="faq">FAQ</H2>
        <dl className="space-y-4">
          {[
            [
              "Where does the data come from?",
              "Public federal court records via CourtListener/RECAP (a non-profit project). We track every case filed since 2018 whose caption names a sealed “Schedule A” defendant list, refreshed daily.",
            ],
            [
              "Is this legal advice?",
              "No. It's a research tool over public records. A red verdict is not a legal determination and a green one is not clearance — for real decisions about an existing dispute, talk to an attorney.",
            ],
            [
              "Why can a green product still get me sued?",
              "Brands file new cases every day, some suits enforce design patents without a famous name, and our matching is by brand and case text — not by product photos (yet).",
            ],
            [
              "What should I search — brand or product title?",
              "Either works. The safest habit: search the brand or franchise the product resembles, then paste the full listing title as a second check.",
            ],
          ].map(([q, a]) => (
            <div key={q}>
              <dt className="font-medium">{q}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-ink-2">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-2 border-ink bg-surface p-7 text-center">
        <p className="mb-4 font-display text-2xl font-medium">Ready? Check your next product.</p>
        <Link
          href="/"
          className="inline-block bg-ink px-6 py-3 text-xs font-medium uppercase tracking-[0.12em] text-page transition-colors hover:bg-ink/85"
        >
          Run a check
        </Link>
      </section>
    </div>
  );
}
