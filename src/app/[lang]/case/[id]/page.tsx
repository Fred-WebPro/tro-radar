import Link from "next/link";
import { notFound } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import CaseList from "@/components/CaseList";
import { getCase, casesByBrandNorm } from "@/lib/repo";
import { isLang, p, type Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const T = {
  en: {
    back: (b: string) => `← All “${b}” cases`,
    fields: ["Plaintiff", "Court", "Docket number", "Date filed", "Date terminated", "PACER case ID"],
    open: "— (case is open)",
    parties: "Parties",
    docket: "View full docket on CourtListener ↗",
    other: (b: string, n: number) => `Other cases by ${b} (${n})`,
  },
  ru: {
    back: (b: string) => `← Все дела «${b}»`,
    fields: ["Истец", "Суд", "Номер дела", "Дата подачи", "Дата закрытия", "PACER ID"],
    open: "— (дело открыто)",
    parties: "Стороны",
    docket: "Открыть полный докет на CourtListener ↗",
    other: (b: string, n: number) => `Другие дела ${b} (${n})`,
  },
};

export default async function CasePage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang: langParam, id } = await params;
  if (!isLang(langParam)) notFound();
  const lang: Lang = langParam;
  const t = T[lang];
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
        <Link
          href={p(lang, `/check?q=${encodeURIComponent(c.brand)}`)}
          className="text-sm text-link hover:underline"
        >
          {t.back(c.brand)}
        </Link>
      </div>

      <header className="space-y-4">
        <StatusBadge lang={lang} terminated={c.date_terminated} />
        <h1 className="font-display text-3xl font-medium leading-snug tracking-tight">
          {c.case_name}
        </h1>
      </header>

      <dl className="grid gap-x-8 gap-y-5 border-y border-rule bg-surface p-6 sm:grid-cols-2">
        {(
          [
            [t.fields[0], c.plaintiff],
            [t.fields[1], c.court],
            [t.fields[2], c.docket_number ?? "—"],
            [t.fields[3], c.date_filed],
            [t.fields[4], c.date_terminated ?? t.open],
            [t.fields[5], c.pacer_case_id ?? "—"],
          ] as const
        ).map(([k, v]) => (
          <div key={k}>
            <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">{k}</dt>
            <dd className="mt-1 text-sm">{v}</dd>
          </div>
        ))}
      </dl>

      {parties.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-2">
            {t.parties}
          </h2>
          <ul className="space-y-1 text-sm text-ink-2">
            {parties.map((party) => (
              <li key={party}>{party}</li>
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
        {t.docket}
      </a>

      {related.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-2">
            {t.other(c.brand, related.length)}
          </h2>
          <CaseList lang={lang} cases={related.slice(0, 15)} />
        </section>
      )}
    </div>
  );
}
