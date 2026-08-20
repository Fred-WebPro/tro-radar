import type { CaseRow, BrandGroup } from "./repo";

export type Verdict = "red" | "yellow" | "green";

export interface RiskAssessment {
  verdict: Verdict;
  headline: string;
  detail: string;
  activeCount: number;
  closedCount: number;
  lastFiled: string | null;
}

/**
 * Brand-level risk from matching cases. Conservative by design:
 * any active Schedule A case involving a matched brand is a hard red.
 */
export function assessRisk(matches: CaseRow[], groups: BrandGroup[]): RiskAssessment {
  const active = matches.filter((m) => !m.date_terminated);
  const lastFiled = matches.reduce<string | null>(
    (acc, m) => (acc === null || m.date_filed > acc ? m.date_filed : acc),
    null
  );

  if (active.length > 0) {
    const brands = groups.filter((g) => g.active > 0).map((g) => g.brand);
    return {
      verdict: "red",
      headline: "Active enforcement — do not list",
      detail: `${active.length} active Schedule A case${active.length === 1 ? "" : "s"} match this search (${brands.slice(0, 3).join(", ")}${brands.length > 3 ? "…" : ""}). Sellers of matching products are being sued right now; listings risk takedowns and frozen funds.`,
      activeCount: active.length,
      closedCount: matches.length - active.length,
      lastFiled,
    };
  }

  if (matches.length > 0) {
    return {
      verdict: "yellow",
      headline: "Enforcement history — proceed with caution",
      detail: `${matches.length} closed Schedule A case${matches.length === 1 ? "" : "s"} match this search. The rights holder has sued sellers before and may file again.`,
      activeCount: 0,
      closedCount: matches.length,
      lastFiled,
    };
  }

  return {
    verdict: "green",
    headline: "No matching cases found",
    detail:
      "No Schedule A cases match this search in our database. This is not a guarantee of safety — brands can file at any time, and design patents may be enforced without a recognizable brand name.",
    activeCount: 0,
    closedCount: 0,
    lastFiled: null,
  };
}
