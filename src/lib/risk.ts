import type { CaseRow, BrandGroup } from "./repo";
import type { Lang } from "./i18n";

export type Verdict = "red" | "yellow" | "green";

export interface RiskAssessment {
  verdict: Verdict;
  headline: string;
  detail: string;
  activeCount: number;
  closedCount: number;
  lastFiled: string | null;
}

const TEXTS = {
  en: {
    redHeadline: "Active enforcement — do not list",
    red: (n: number, brands: string) =>
      `${n} active Schedule A case${n === 1 ? "" : "s"} match this search (${brands}). Sellers of matching products are being sued right now; listings risk takedowns and frozen funds.`,
    yellowHeadline: "Enforcement history — proceed with caution",
    yellow: (n: number) =>
      `${n} closed Schedule A case${n === 1 ? "" : "s"} match this search. The rights holder has sued sellers before and may file again.`,
    greenHeadline: "No matching cases found",
    green:
      "No Schedule A cases match this search in our database. This is not a guarantee of safety — brands can file at any time, and design patents may be enforced without a recognizable brand name.",
  },
  ru: {
    redHeadline: "Активные иски — не выставляйте товар",
    red: (n: number, brands: string) =>
      `По этому запросу найдено активных дел Schedule A: ${n} (${brands}). Продавцов таких товаров судят прямо сейчас; листинг грозит блокировками и заморозкой средств.`,
    yellowHeadline: "История исков — будьте осторожны",
    yellow: (n: number) =>
      `По этому запросу найдено закрытых дел Schedule A: ${n}. Правообладатель уже судился с продавцами и может подать иск снова.`,
    greenHeadline: "Совпадений не найдено",
    green:
      "В нашей базе нет дел Schedule A по этому запросу. Это не гарантия безопасности: бренд может подать иск в любой момент, а патенты на дизайн защищают и без узнаваемого имени.",
  },
} as const;

/**
 * Brand-level risk from matching cases. Conservative by design:
 * any active Schedule A case involving a matched brand is a hard red.
 */
export function assessRisk(
  matches: CaseRow[],
  groups: BrandGroup[],
  lang: Lang = "en"
): RiskAssessment {
  const t = TEXTS[lang];
  const active = matches.filter((m) => !m.date_terminated);
  const lastFiled = matches.reduce<string | null>(
    (acc, m) => (acc === null || m.date_filed > acc ? m.date_filed : acc),
    null
  );

  if (active.length > 0) {
    const brands = groups.filter((g) => g.active > 0).map((g) => g.brand);
    const brandStr = `${brands.slice(0, 3).join(", ")}${brands.length > 3 ? "…" : ""}`;
    return {
      verdict: "red",
      headline: t.redHeadline,
      detail: t.red(active.length, brandStr),
      activeCount: active.length,
      closedCount: matches.length - active.length,
      lastFiled,
    };
  }

  if (matches.length > 0) {
    return {
      verdict: "yellow",
      headline: t.yellowHeadline,
      detail: t.yellow(matches.length),
      activeCount: 0,
      closedCount: matches.length,
      lastFiled,
    };
  }

  return {
    verdict: "green",
    headline: t.greenHeadline,
    detail: t.green,
    activeCount: 0,
    closedCount: 0,
    lastFiled: null,
  };
}
