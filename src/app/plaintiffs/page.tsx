import Link from "next/link";
import { topPlaintiffs } from "@/lib/repo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Serial plaintiffs" };

export default async function PlaintiffsPage() {
  const rows = await topPlaintiffs(100);
  return (
    <div className="space-y-6 py-12">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-medium tracking-tight">Serial plaintiffs</h1>
        <p className="max-w-2xl text-sm text-ink-2">
          Brands that file the most Schedule A cases. Selling anything resembling these brands is
          the fastest way to a frozen account.
        </p>
      </header>

      <div className="overflow-x-auto border-y border-rule bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule text-left font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Brand</th>
              <th className="px-4 py-3 text-right font-medium">Cases</th>
              <th className="px-4 py-3 text-right font-medium">Active</th>
              <th className="px-4 py-3 text-right font-medium">Last filed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {rows.map((p, i) => (
              <tr key={p.brand_norm} className="transition-colors hover:bg-page">
                <td className="px-4 py-3 font-mono tabular-nums text-ink-muted">{i + 1}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/check?q=${encodeURIComponent(p.brand)}`}
                    className="font-medium hover:text-link"
                  >
                    {p.brand}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{p.total}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {p.active > 0 ? <span className="text-critical-ink">{p.active}</span> : "0"}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-ink-muted">
                  {p.last_filed}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
