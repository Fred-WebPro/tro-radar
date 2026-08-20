import Link from "next/link";
import { notFound } from "next/navigation";
import SearchBox from "@/components/SearchBox";
import SubscribeForm from "@/components/SubscribeForm";
import CaseList from "@/components/CaseList";
import { searchCases, groupByBrand } from "@/lib/repo";
import { assessRisk, type Verdict } from "@/lib/risk";
import { isLang, p, ui, type Lang } from "@/lib/i18n";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const T = {
  en: {
    title: (q: string) => `Is “${q}” safe to sell? Schedule A lawsuit check`,
    description: (q: string) =>
      `Check whether “${q}” is involved in active Schedule A / TRO trademark lawsuits against online sellers, based on federal court records.`,
    emptyTitle: "Check a product before you list it",
    emptyLead: (
      <>
        Type the <strong className="text-ink">brand on the product</strong> (or paste the whole
        listing title) — we match it against every Schedule A lawsuit filed since 2018.
      </>
    ),
    tryExample: "Try an example",
    firstTime: "First time here? Read the",
    guideLink: "3-minute guide",
    firstTimeTail: "— what these lawsuits are and how to read the verdict.",
    lastFiled: "Most recent matching filing:",
    howToRead: "How to read this verdict →",
    matchedBrands: "Matched brands",
    matchingCases: "Matching cases",
    caseWord: (n: number) => `${n} case${n === 1 ? "" : "s"}`,
    activeWord: (n: number) => `${n} active`,
    watch: (q: string) => `Watch “${q}”`,
    watchSub: "Get an email when a new Schedule A case matching this search is filed.",
  },
  ru: {
    title: (q: string) => `Можно ли продавать «${q}»? Проверка исков Schedule A`,
    description: (q: string) =>
      `Проверьте, фигурирует ли «${q}» в активных исках Schedule A / TRO против онлайн-продавцов — по записям федеральных судов США.`,
    emptyTitle: "Проверьте товар до листинга",
    emptyLead: (
      <>
        Введите <strong className="text-ink">бренд на товаре</strong> (или вставьте название
        листинга целиком) — мы сверим его с каждым иском Schedule A с 2018 года.
      </>
    ),
    tryExample: "Попробуйте пример",
    firstTime: "Впервые здесь? Прочитайте",
    guideLink: "гид за 3 минуты",
    firstTimeTail: "— что это за иски и как читать вердикт.",
    lastFiled: "Последний совпавший иск:",
    howToRead: "Как читать этот вердикт →",
    matchedBrands: "Совпавшие бренды",
    matchingCases: "Совпавшие дела",
    caseWord: (n: number) => `${n} дел`,
    activeWord: (n: number) => `${n} активных`,
    watch: (q: string) => `Следить за «${q}»`,
    watchSub: "Получите письмо, когда появится новый иск Schedule A по этому запросу.",
  },
};

const SAMPLES = ["Harley-Davidson", "Sony PlayStation controller", "Paddington plush", "generic silicone spatula"];

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const { q = "" } = await searchParams;
  const t = T[lang === "ru" ? "ru" : "en"];
  const query = q.trim();
  if (!query) return { title: lang === "ru" ? "Проверка риска" : "Risk check" };
  return { title: t.title(query), description: t.description(query) };
}

const VERDICT_STYLE: Record<
  Verdict,
  { border: string; bg: string; text: string; icon: string }
> = {
  red: { border: "border-critical", bg: "bg-critical/5", text: "text-critical-ink", icon: "⚠" },
  yellow: { border: "border-warn", bg: "bg-warn/10", text: "text-warn-ink", icon: "◆" },
  green: { border: "border-good", bg: "bg-good/5", text: "text-good-ink", icon: "✓" },
};

export default async function CheckPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { lang: langParam } = await params;
  if (!isLang(langParam)) notFound();
  const lang: Lang = langParam;
  const t = T[lang];
  const { q = "" } = await searchParams;
  const query = q.trim();
  const matches = query ? await searchCases(query) : [];
  const groups = groupByBrand(matches);
  const risk = assessRisk(matches, groups, lang);
  const style = VERDICT_STYLE[risk.verdict];

  return (
    <div className="space-y-10 py-12">
      <SearchBox key={query} lang={lang} initial={query} />

      {query === "" ? (
        <div className="max-w-2xl space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-medium tracking-tight">{t.emptyTitle}</h1>
            <p className="leading-relaxed text-ink-2">{t.emptyLead}</p>
          </div>
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              {t.tryExample}
            </p>
            <div className="flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <Link
                  key={s}
                  href={p(lang, `/check?q=${encodeURIComponent(s)}`)}
                  className="border border-rule-strong bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-ink"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
          <p className="text-sm text-ink-muted">
            {t.firstTime}{" "}
            <Link href={p(lang, "/guide")} className="text-link hover:underline">
              {t.guideLink}
            </Link>{" "}
            {t.firstTimeTail}
          </p>
        </div>
      ) : (
        <>
          <section className={`border-2 ${style.border} ${style.bg} p-7`} aria-live="polite">
            <div
              className={`mb-3 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.16em] ${style.text}`}
            >
              <span aria-hidden>{style.icon}</span>
              {ui[lang].verdict[risk.verdict]}
            </div>
            <h1 className="font-display text-3xl font-medium leading-tight tracking-tight">
              {risk.headline}
            </h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-ink-2">{risk.detail}</p>
            {risk.lastFiled && (
              <p className="mt-3 font-mono text-xs text-ink-muted">
                {t.lastFiled} {risk.lastFiled}
              </p>
            )}
            <p className="mt-3 text-xs">
              <Link href={p(lang, "/guide#verdicts")} className="text-link hover:underline">
                {t.howToRead}
              </Link>
            </p>
          </section>

          {groups.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-2">
                {t.matchedBrands}
              </h2>
              <div className="flex flex-wrap gap-2">
                {groups.slice(0, 12).map((g) => (
                  <Link
                    key={g.brand_norm}
                    href={p(lang, `/check?q=${encodeURIComponent(g.brand)}`)}
                    className="border border-rule-strong bg-surface px-3 py-1.5 text-sm transition-colors hover:border-ink"
                  >
                    <span className="font-medium">{g.brand}</span>{" "}
                    <span className="text-ink-muted">
                      {t.caseWord(g.total)}
                      {g.active > 0 && (
                        <span className="text-critical-ink"> · {t.activeWord(g.active)}</span>
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
                {t.matchingCases} ({matches.length}
                {matches.length >= 60 ? "+" : ""})
              </h2>
              <CaseList lang={lang} cases={matches.slice(0, 30)} />
            </section>
          )}

          <section className="space-y-3 border-2 border-ink bg-surface p-7">
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-2">
              {t.watch(query)}
            </h2>
            <p className="text-sm text-ink-2">{t.watchSub}</p>
            <SubscribeForm key={query} lang={lang} query={query} />
          </section>
        </>
      )}
    </div>
  );
}
