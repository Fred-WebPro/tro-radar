import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccountByToken, limitsFor } from "@/lib/accounts";
import { listPortfolio } from "@/lib/portfolio";
import { isLang, p, type Lang } from "@/lib/i18n";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const T = {
  en: {
    title: "Your portfolio",
    sub: "Products we re-check against every new Schedule A filing.",
    noToken:
      "Open this page from an alert email, or from the extension’s Settings, so we know whose portfolio to show.",
    empty:
      "Nothing pinned yet. Open a product on AliExpress or Temu with the extension installed and hit “Watch this product”.",
    atRisk: (n: number) => `${n} under active lawsuits`,
    safe: "Nothing under active lawsuits right now",
    cases: "active cases",
    checked: "Last checked",
    plan: "Plan",
    of: "of",
    products: "products",
    open: "Open product ↗",
    check: "See cases →",
  },
  ru: {
    title: "Ваш портфель",
    sub: "Товары, которые мы сверяем с каждым новым иском Schedule A.",
    noToken:
      "Откройте эту страницу из письма-алерта или из настроек расширения — так мы поймём, чей портфель показать.",
    empty:
      "Пока пусто. Откройте товар на AliExpress или Temu с установленным расширением и нажмите «Следить за товаром».",
    atRisk: (n: number) => `${n} под активными исками`,
    safe: "Сейчас под активными исками ничего нет",
    cases: "активных дел",
    checked: "Проверено",
    plan: "Тариф",
    of: "из",
    products: "товаров",
    open: "Открыть товар ↗",
    check: "Смотреть дела →",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return { title: T[lang === "ru" ? "ru" : "en"].title, robots: { index: false } };
}

const DOT: Record<string, string> = {
  red: "bg-critical",
  yellow: "bg-warn",
  green: "bg-good",
};

export default async function PortfolioPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { lang: langParam } = await params;
  if (!isLang(langParam)) notFound();
  const lang: Lang = langParam;
  const t = T[lang];
  const { token = "" } = await searchParams;

  const account = token ? await getAccountByToken(token) : null;

  if (!account) {
    return (
      <div className="space-y-4 py-12">
        <h1 className="font-display text-3xl font-medium tracking-tight">{t.title}</h1>
        <p className="max-w-xl leading-relaxed text-ink-2">{t.noToken}</p>
      </div>
    );
  }

  const items = await listPortfolio(account.id);
  const atRisk = items.filter((i) => i.last_verdict === "red").length;
  const limits = limitsFor(account.plan);

  return (
    <div className="space-y-8 py-12">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-medium tracking-tight">{t.title}</h1>
        <p className="text-sm text-ink-2">{t.sub}</p>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          {t.plan}: {account.plan} · {items.length} {t.of} {limits.portfolioItems} {t.products}
        </p>
      </header>

      <div
        className={`border-2 p-5 ${atRisk > 0 ? "border-critical bg-critical/5" : "border-good bg-good/5"}`}
      >
        <p
          className={`font-mono text-xs font-semibold uppercase tracking-[0.16em] ${atRisk > 0 ? "text-critical-ink" : "text-good-ink"}`}
        >
          {atRisk > 0 ? `⚠ ${t.atRisk(atRisk)}` : `✓ ${t.safe}`}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="max-w-xl leading-relaxed text-ink-2">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-rule border-y border-rule bg-surface">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-4 py-4">
              <span
                aria-hidden
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[item.last_verdict ?? ""] ?? "bg-rule-strong"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium">{item.title}</div>
                <div className="mt-1 flex flex-wrap gap-x-3 font-mono text-[11px] text-ink-muted">
                  {item.last_active_cases > 0 && (
                    <span className="text-critical-ink">
                      {item.last_active_cases} {t.cases}
                    </span>
                  )}
                  {item.source && <span>{item.source}</span>}
                  {item.last_checked_at && (
                    <span>
                      {t.checked} {item.last_checked_at.slice(0, 10)}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex gap-4 text-xs">
                  <Link
                    href={p(lang, `/check?q=${encodeURIComponent(item.title)}`)}
                    className="text-link hover:underline"
                  >
                    {t.check}
                  </Link>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink-muted hover:text-ink"
                    >
                      {t.open}
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
