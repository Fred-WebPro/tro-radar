// Plaintiff intelligence: the depth behind the traffic light. Answers
// "how aggressively does this brand actually enforce?" rather than just
// "is there a case?".

import { query } from "./db";
import { bestFirmLabel } from "./firms";
import type { Lang } from "./i18n";

export interface FirmInfo {
  firm: string;
  cases: number;
  /** True when this firm runs Schedule A cases at industrial scale. */
  serial: boolean;
}

export interface PlaintiffIntel {
  brand: string;
  brandNorm: string;
  totalCases: number;
  activeCases: number;
  firstFiled: string;
  lastFiled: string;
  daysSinceLastFiling: number;
  filingsLast90d: number;
  filingsLast365d: number;
  /** Median gap between consecutive filings, in days. Null if under 3 cases. */
  medianDaysBetween: number | null;
  courts: { court: string; cases: number }[];
  firms: FirmInfo[];
}

/** A firm at or above this many Schedule A dockets runs an enforcement mill. */
const SERIAL_FIRM_THRESHOLD = 25;

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + "T12:00:00Z").getTime() - new Date(a + "T12:00:00Z").getTime()) / 86_400_000
  );
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export async function getPlaintiffIntel(brandNorm: string): Promise<PlaintiffIntel | null> {
  const [rows, courts, firmRows] = await Promise.all([
    query<{ brand: string; date_filed: string; date_terminated: string | null }>(
      "SELECT brand, date_filed, date_terminated FROM cases WHERE brand_norm = ? ORDER BY date_filed",
      [brandNorm]
    ),
    query<{ court: string; cases: number }>(
      `SELECT court, COUNT(*) AS cases FROM cases WHERE brand_norm = ?
       GROUP BY court ORDER BY cases DESC LIMIT 4`,
      [brandNorm]
    ),
    query<{ firm: string; firm_norm: string; cases: number; total_cases: number }>(
      `SELECT cf.firm AS firm, cf.firm_norm AS firm_norm, COUNT(DISTINCT cf.docket_id) AS cases,
         (SELECT COUNT(DISTINCT docket_id) FROM case_firms x WHERE x.firm_norm = cf.firm_norm) AS total_cases
       FROM case_firms cf
       JOIN cases c ON c.docket_id = cf.docket_id
       WHERE c.brand_norm = ? AND LENGTH(cf.firm_norm) >= 4
       GROUP BY cf.firm_norm ORDER BY cases DESC LIMIT 5`,
      [brandNorm]
    ),
  ]);

  if (rows.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);
  const dates = rows.map((r) => r.date_filed);
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) gaps.push(daysBetween(dates[i - 1], dates[i]));

  const firmsByNorm = new Map<string, { labels: string[]; cases: number; total: number }>();
  for (const f of firmRows) {
    const e = firmsByNorm.get(f.firm_norm) ?? { labels: [], cases: 0, total: Number(f.total_cases) };
    e.labels.push(f.firm);
    e.cases = Math.max(e.cases, Number(f.cases));
    firmsByNorm.set(f.firm_norm, e);
  }

  return {
    brand: rows[rows.length - 1].brand,
    brandNorm,
    totalCases: rows.length,
    activeCases: rows.filter((r) => !r.date_terminated).length,
    firstFiled: dates[0],
    lastFiled: dates[dates.length - 1],
    daysSinceLastFiling: Math.max(0, daysBetween(dates[dates.length - 1], today)),
    filingsLast90d: dates.filter((d) => daysBetween(d, today) <= 90).length,
    filingsLast365d: dates.filter((d) => daysBetween(d, today) <= 365).length,
    medianDaysBetween: dates.length >= 3 ? median(gaps) : null,
    courts: courts.map((c) => ({ court: c.court, cases: Number(c.cases) })),
    firms: [...firmsByNorm.values()].map((e) => ({
      firm: bestFirmLabel(e.labels),
      cases: e.cases,
      serial: e.total >= SERIAL_FIRM_THRESHOLD,
    })),
  };
}

export type RiskLevel = "critical" | "high" | "moderate" | "low" | "minimal";

export interface RiskFactor {
  label: string;
  detail: string;
  /** Points this factor contributed to the score. */
  points: number;
}

export interface RiskScore {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
  /** One-line plain-language summary of the enforcement pattern. */
  summary: string;
}

const L = {
  en: {
    activeCases: "Active cases",
    activeCasesD: (n: number) => `${n} Schedule A case${n === 1 ? "" : "s"} open right now`,
    recent: "Recent filing",
    recentD: (d: number) =>
      d <= 1 ? "Filed a new case today" : `Last case filed ${d} day${d === 1 ? "" : "s"} ago`,
    cadence: "Filing cadence",
    cadenceD: (d: number) => `Files a new case every ~${d} day${d === 1 ? "" : "s"}`,
    volume: "Enforcement volume",
    volumeD: (n: number, y: number) => `${n} cases total, ${y} in the last 12 months`,
    firm: "Enforcement mill",
    firmD: (f: string, n: number) => `Represented by ${f}, which runs ${n}+ Schedule A cases`,
    history: "Past enforcement",
    historyD: (n: number) => `${n} closed case${n === 1 ? "" : "s"} — the brand has sued sellers before`,
    dormant: "Dormant",
    dormantD: (d: number) => `No new filing in ${d} days`,
    sumCritical: (b: string, d: number) =>
      `${b} is filing continuously — a new case every ~${d} days. Selling anything resembling this brand is close to a guaranteed freeze.`,
    sumHigh: (b: string) =>
      `${b} has open cases and files regularly. Treat any lookalike product as unsafe.`,
    sumModerate: (b: string) =>
      `${b} enforces occasionally. Unbranded goods in the niche are usually fine; anything carrying their marks is not.`,
    sumLow: (b: string) => `${b} has sued sellers before, but not recently.`,
    sumMinimal: "No enforcement pattern found for this search.",
  },
  ru: {
    activeCases: "Активные дела",
    activeCasesD: (n: number) => `Открытых дел Schedule A прямо сейчас: ${n}`,
    recent: "Свежий иск",
    recentD: (d: number) => (d <= 1 ? "Новое дело подано сегодня" : `Последнее дело подано ${d} дн. назад`),
    cadence: "Частота подач",
    cadenceD: (d: number) => `Подаёт новое дело примерно раз в ${d} дн.`,
    volume: "Объём исков",
    volumeD: (n: number, y: number) => `${n} дел всего, ${y} за последние 12 месяцев`,
    firm: "Юрфирма-конвейер",
    firmD: (f: string, n: number) => `Интересы ведёт ${f} — ${n}+ дел Schedule A`,
    history: "История исков",
    historyD: (n: number) => `Закрытых дел: ${n} — бренд уже судился с продавцами`,
    dormant: "Затишье",
    dormantD: (d: number) => `Новых исков нет уже ${d} дн.`,
    sumCritical: (b: string, d: number) =>
      `${b} судится непрерывно — новое дело примерно раз в ${d} дн. Продавать что-либо похожее — почти гарантированная заморозка.`,
    sumHigh: (b: string) =>
      `У ${b} есть открытые дела, иски подаются регулярно. Любой похожий товар считайте небезопасным.`,
    sumModerate: (b: string) =>
      `${b} судится время от времени. No-name товары в нише обычно безопасны, всё с их марками — нет.`,
    sumLow: (b: string) => `${b} судился с продавцами раньше, но не в последнее время.`,
    sumMinimal: "Схемы исков по этому запросу не найдено.",
  },
} as const;

function levelFor(score: number): RiskLevel {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "moderate";
  if (score >= 15) return "low";
  return "minimal";
}

/**
 * Turn enforcement history into a 0–100 score. Weighted toward what actually
 * predicts a freeze: open cases, how recently they filed, and how fast they
 * repeat — not raw case count.
 */
export function computeRiskScore(intel: PlaintiffIntel | null, lang: Lang = "en"): RiskScore {
  const t = L[lang];
  if (!intel || intel.totalCases === 0) {
    return { score: 0, level: "minimal", factors: [], summary: t.sumMinimal };
  }

  const factors: RiskFactor[] = [];
  let score = 0;

  if (intel.activeCases > 0) {
    const pts = Math.min(45, 25 + intel.activeCases * 2);
    score += pts;
    factors.push({ label: t.activeCases, detail: t.activeCasesD(intel.activeCases), points: pts });
  } else {
    const pts = Math.min(15, 5 + intel.totalCases);
    score += pts;
    factors.push({ label: t.history, detail: t.historyD(intel.totalCases), points: pts });
  }

  const d = intel.daysSinceLastFiling;
  if (d <= 90) {
    const pts = d <= 7 ? 20 : d <= 30 ? 15 : 8;
    score += pts;
    factors.push({ label: t.recent, detail: t.recentD(d), points: pts });
  } else if (d > 730) {
    factors.push({ label: t.dormant, detail: t.dormantD(d), points: 0 });
  }

  if (intel.medianDaysBetween !== null && intel.medianDaysBetween <= 120) {
    const m = intel.medianDaysBetween;
    const pts = m <= 14 ? 20 : m <= 45 ? 12 : 6;
    score += pts;
    factors.push({ label: t.cadence, detail: t.cadenceD(Math.max(1, m)), points: pts });
  }

  if (intel.filingsLast365d >= 3) {
    const pts = Math.min(10, Math.floor(intel.filingsLast365d / 3));
    score += pts;
    factors.push({
      label: t.volume,
      detail: t.volumeD(intel.totalCases, intel.filingsLast365d),
      points: pts,
    });
  }

  const serial = intel.firms.find((f) => f.serial);
  if (serial) {
    score += 5;
    factors.push({ label: t.firm, detail: t.firmD(serial.firm, serial.cases), points: 5 });
  }

  score = Math.max(0, Math.min(100, score));
  const level = levelFor(score);
  const cadence = intel.medianDaysBetween ?? 0;
  const summary =
    level === "critical" && cadence > 0
      ? t.sumCritical(intel.brand, Math.max(1, cadence))
      : level === "critical" || level === "high"
        ? t.sumHigh(intel.brand)
        : level === "moderate"
          ? t.sumModerate(intel.brand)
          : level === "low"
            ? t.sumLow(intel.brand)
            : t.sumMinimal;

  return { score, level, factors, summary };
}
