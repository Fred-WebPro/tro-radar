import Link from "next/link";
import { notFound } from "next/navigation";
import { topPlaintiffs } from "@/lib/repo";
import { isLang, p, type Lang } from "@/lib/i18n";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const T = {
  en: {
    title: "Serial plaintiffs",
    sub: "Brands that file the most Schedule A cases. Selling anything resembling these brands is the fastest way to a frozen account.",
    cols: ["#", "Brand", "Cases", "Active", "Last filed"],
  },
  ru: {
    title: "Серийные истцы",
    sub: "Бренды, которые подают больше всего исков Schedule A. Продавать что-то похожее на эти бренды — кратчайший путь к замороженному аккаунту.",
    cols: ["#", "Бренд", "Дел", "Активных", "Последний иск"],
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return { title: T[lang === "ru" ? "ru" : "en"].title };
}

export default async function PlaintiffsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: langParam } = await params;
  if (!isLang(langParam)) notFound();
  const lang: Lang = langParam;
  const t = T[lang];
  const rows = await topPlaintiffs(100);
  return (
    <div className="space-y-6 py-12">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-medium tracking-tight">{t.title}</h1>
        <p className="max-w-2xl text-sm text-ink-2">{t.sub}</p>
      </header>

      <div className="overflow-x-auto border-y border-rule bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule text-left font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              {t.cols.map((c, i) => (
                <th key={c} className={`px-4 py-3 font-medium ${i >= 2 ? "text-right" : ""}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {rows.map((pl, i) => (
              <tr key={pl.brand_norm} className="transition-colors hover:bg-page">
                <td className="px-4 py-3 font-mono tabular-nums text-ink-muted">{i + 1}</td>
                <td className="px-4 py-3">
                  <Link
                    href={p(lang, `/check?q=${encodeURIComponent(pl.brand)}`)}
                    className="font-medium hover:text-link"
                  >
                    {pl.brand}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{pl.total}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {pl.active > 0 ? <span className="text-critical-ink">{pl.active}</span> : "0"}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-ink-muted">
                  {pl.last_filed}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
