import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import SubscribeForm from "@/components/SubscribeForm";
import TrendChart from "@/components/TrendChart";
import CaseList from "@/components/CaseList";
import Ticker from "@/components/Ticker";
import CountUp from "@/components/CountUp";
import Reveal from "@/components/Reveal";
import { getStats, monthlyCounts, recentCases, topPlaintiffs } from "@/lib/repo";
import { isLang, p, type Lang } from "@/lib/i18n";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const T = {
  en: {
    overline: "Federal court monitoring · updated daily",
    h1: <>Know before you&nbsp;list.</>,
    lead: (
      <>
        Every week, brands file <em>Schedule A</em> lawsuits against hundreds of online sellers at
        once — and sellers find out only when their PayPal or marketplace account is frozen. TRO
        Radar tracks these cases so you can check a brand{" "}
        <strong className="font-semibold text-ink">before</strong> you list the product.
      </>
    ),
    stats: ["cases tracked", "active right now", "filed last 30 days", "brands enforcing"],
    chartHeading: "Filing activity — last 12 months",
    latest: "Latest filings",
    viewAll: "View all →",
    litigious: "Most litigious brands",
    fullList: "Full list →",
    casesActive: (total: number, active: number) => (
      <>
        {total} cases · <span className="text-critical-ink">{active} active</span>
      </>
    ),
    how: "How it works",
    fullGuide: "Full guide →",
    steps: [
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
    ],
    alerts: "Get alerts for a brand",
    alertsSub: "Weekly digest of new Schedule A filings that match your watchlist.",
  },
  ru: {
    overline: "Мониторинг федеральных судов США · обновляется ежедневно",
    h1: <>Узнай до&nbsp;листинга.</>,
    lead: (
      <>
        Каждую неделю бренды подают иски <em>Schedule A</em> сразу против сотен онлайн-продавцов —
        а продавец узнаёт об этом, только когда его PayPal или аккаунт на маркетплейсе уже
        заморожен. TRO Radar отслеживает эти дела, чтобы вы проверяли бренд{" "}
        <strong className="font-semibold text-ink">до</strong> того, как выставить товар.
      </>
    ),
    stats: ["дел в базе", "активны сейчас", "подано за 30 дней", "брендов-истцов"],
    chartHeading: "Активность исков — последние 12 месяцев",
    latest: "Свежие иски",
    viewAll: "Все →",
    litigious: "Самые сутяжные бренды",
    fullList: "Полный список →",
    casesActive: (total: number, active: number) => (
      <>
        {total} дел · <span className="text-critical-ink">{active} активных</span>
      </>
    ),
    how: "Как это работает",
    fullGuide: "Полный гид →",
    steps: [
      {
        t: "Найдите бренд",
        d: "Введите бренд товара, который собираетесь закупать — с AliExpress, Temu, 1688 или откуда угодно.",
      },
      {
        t: "Прочитайте вердикт",
        d: "Мы сверим запрос с каждым делом Schedule A в базе, собранной из публичных записей федеральных судов.",
      },
      {
        t: "Поставьте на контроль",
        d: "Подпишитесь на бренд — получите письмо в день подачи нового иска, до того как разойдутся ордера на заморозку.",
      },
    ],
    alerts: "Алерты по бренду",
    alertsSub: "Дайджест новых исков Schedule A, совпадающих с вашим списком наблюдения.",
  },
};

function StatCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-5 py-5">
      <CountUp value={value} className="font-display text-4xl font-medium tracking-tight" />
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

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: langParam } = await params;
  if (!isLang(langParam)) notFound();
  const lang: Lang = langParam;
  const t = T[lang];

  const [stats, months, recent, plaintiffs] = await Promise.all([
    getStats(),
    monthlyCounts(12),
    recentCases(14),
    topPlaintiffs(6),
  ]);

  return (
    <div className="space-y-16 py-10">
      <Ticker lang={lang} cases={recent} />

      <section className="space-y-7">
        <p className="anim-fade-up font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
          {t.overline}
        </p>
        <h1
          className="anim-fade-up max-w-3xl font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl"
          style={{ animationDelay: "90ms" }}
        >
          {t.h1}
        </h1>
        <p
          className="anim-fade-up max-w-2xl text-lg leading-relaxed text-ink-2"
          style={{ animationDelay: "180ms" }}
        >
          {t.lead}
        </p>
        <div className="anim-fade-up" style={{ animationDelay: "270ms" }}>
          <SearchBox lang={lang} autoFocus />
        </div>
      </section>

      <section className="grid grid-cols-2 divide-x divide-rule border-y border-rule bg-surface sm:grid-cols-4">
        <StatCell value={stats.total} label={t.stats[0]} />
        <StatCell value={stats.active} label={t.stats[1]} />
        <StatCell value={stats.last30d} label={t.stats[2]} />
        <StatCell value={stats.brands} label={t.stats[3]} />
      </section>

      <Reveal>
        <section className="space-y-4">
          <SectionHeading>{t.chartHeading}</SectionHeading>
          <div className="border-y border-rule bg-surface px-4 py-5">
            <TrendChart lang={lang} data={months} />
          </div>
        </section>
      </Reveal>

      <section className="grid gap-10 md:grid-cols-2">
        <Reveal className="space-y-3">
          <div className="flex items-baseline justify-between">
            <SectionHeading>{t.latest}</SectionHeading>
            <Link href={p(lang, "/recent")} className="text-sm text-link hover:underline">
              {t.viewAll}
            </Link>
          </div>
          <CaseList lang={lang} cases={recent.slice(0, 6)} />
        </Reveal>
        <Reveal className="space-y-3">
          <div className="flex items-baseline justify-between">
            <SectionHeading>{t.litigious}</SectionHeading>
            <Link href={p(lang, "/plaintiffs")} className="text-sm text-link hover:underline">
              {t.fullList}
            </Link>
          </div>
          <ul className="divide-y divide-rule border-y border-rule bg-surface">
            {plaintiffs.map((pl, i) => (
              <li key={pl.brand_norm}>
                <Link
                  href={p(lang, `/check?q=${encodeURIComponent(pl.brand)}`)}
                  className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-page"
                >
                  <span className="w-5 shrink-0 font-display text-lg text-ink-muted">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{pl.brand}</span>
                  <span className="shrink-0 font-mono text-[11px] text-ink-muted">
                    {t.casesActive(pl.total, pl.active)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      <Reveal>
        <section className="space-y-5">
          <div className="flex items-baseline justify-between">
            <SectionHeading>{t.how}</SectionHeading>
            <Link href={p(lang, "/guide")} className="text-sm text-link hover:underline">
              {t.fullGuide}
            </Link>
          </div>
          <ol className="grid gap-x-8 gap-y-6 sm:grid-cols-3">
            {t.steps.map((s, i) => (
              <li key={s.t} className="border-t-2 border-ink pt-4">
                <div className="font-display text-2xl text-ink-muted">0{i + 1}</div>
                <div className="mb-1.5 mt-2 font-medium">{s.t}</div>
                <div className="text-sm leading-relaxed text-ink-2">{s.d}</div>
              </li>
            ))}
          </ol>
        </section>
      </Reveal>

      <Reveal>
        <section className="space-y-3 border-2 border-ink bg-surface p-7">
          <SectionHeading>{t.alerts}</SectionHeading>
          <p className="text-sm text-ink-2">{t.alertsSub}</p>
          <SubscribeForm lang={lang} />
        </section>
      </Reveal>
    </div>
  );
}
