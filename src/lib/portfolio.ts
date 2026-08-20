// The portfolio is what turns a one-off checker into a subscription: the user
// pins the products they actually sell, and every sync re-checks them against
// new filings.

import { query, run } from "./db";
import { searchCases, groupByBrand, type CaseRow } from "./repo";
import { assessRisk, type Verdict } from "./risk";
import type { Lang } from "./i18n";

export interface PortfolioItem {
  id: number;
  account_id: number;
  title: string;
  url: string | null;
  image: string | null;
  source: string | null;
  last_verdict: Verdict | null;
  last_active_cases: number;
  last_checked_at: string | null;
  created_at: string;
}

export async function listPortfolio(accountId: number): Promise<PortfolioItem[]> {
  return query<PortfolioItem>(
    `SELECT * FROM portfolio WHERE account_id = ?
     ORDER BY CASE last_verdict WHEN 'red' THEN 0 WHEN 'yellow' THEN 1 ELSE 2 END,
       created_at DESC`,
    [accountId]
  );
}

export async function countPortfolio(accountId: number): Promise<number> {
  const rows = await query<{ n: number }>(
    "SELECT COUNT(*) AS n FROM portfolio WHERE account_id = ?",
    [accountId]
  );
  return Number(rows[0]?.n ?? 0);
}

export async function addPortfolioItem(
  accountId: number,
  item: { title: string; url?: string; image?: string; source?: string },
  lang: Lang = "en"
): Promise<PortfolioItem | null> {
  const title = item.title.trim().slice(0, 300);
  if (title.length < 3) return null;

  const matches = await searchCases(title);
  const risk = assessRisk(matches, groupByBrand(matches), lang);

  await run(
    `INSERT INTO portfolio (account_id, title, url, image, source, last_verdict, last_active_cases, last_checked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(account_id, title) DO UPDATE SET
       url = excluded.url, image = excluded.image, source = excluded.source,
       last_verdict = excluded.last_verdict, last_active_cases = excluded.last_active_cases,
       last_checked_at = datetime('now')`,
    [
      accountId,
      title,
      item.url ?? null,
      item.image ?? null,
      item.source ?? null,
      risk.verdict,
      risk.activeCount,
    ]
  );

  // Existing matches are the baseline, not news: only cases filed after the
  // item was pinned should ever trigger an alert.
  const rows = await query<PortfolioItem>(
    "SELECT * FROM portfolio WHERE account_id = ? AND title = ?",
    [accountId, title]
  );
  const created = rows[0];
  if (created) await markAlerted(created.id, matches.map((m) => m.docket_id));
  return created ?? null;
}

export async function removePortfolioItem(accountId: number, id: number): Promise<void> {
  await run("DELETE FROM portfolio_alerts WHERE portfolio_id = ?", [id]);
  await run("DELETE FROM portfolio WHERE account_id = ? AND id = ?", [accountId, id]);
}

async function markAlerted(portfolioId: number, docketIds: number[]): Promise<void> {
  for (const docketId of docketIds) {
    await run(
      `INSERT INTO portfolio_alerts (portfolio_id, docket_id) VALUES (?, ?)
       ON CONFLICT(portfolio_id, docket_id) DO NOTHING`,
      [portfolioId, docketId]
    );
  }
}

export interface PortfolioHit {
  item: PortfolioItem;
  freshCases: CaseRow[];
  verdict: Verdict;
  activeCases: number;
}

/**
 * Re-check one item and return only cases never reported for it before.
 * Also refreshes the stored verdict so the UI reflects reality.
 */
export async function recheckItem(item: PortfolioItem, lang: Lang = "en"): Promise<PortfolioHit> {
  const matches = await searchCases(item.title);
  const risk = assessRisk(matches, groupByBrand(matches), lang);

  const seen = await query<{ docket_id: number }>(
    "SELECT docket_id FROM portfolio_alerts WHERE portfolio_id = ?",
    [item.id]
  );
  const seenIds = new Set(seen.map((s) => Number(s.docket_id)));
  const fresh = matches.filter((m) => !seenIds.has(m.docket_id) && !m.date_terminated);

  await run(
    `UPDATE portfolio SET last_verdict = ?, last_active_cases = ?, last_checked_at = datetime('now')
     WHERE id = ?`,
    [risk.verdict, risk.activeCount, item.id]
  );
  if (fresh.length > 0) await markAlerted(item.id, fresh.map((f) => f.docket_id));

  return { item, freshCases: fresh, verdict: risk.verdict, activeCases: risk.activeCount };
}

export async function allPortfolioItems(): Promise<PortfolioItem[]> {
  return query<PortfolioItem>("SELECT * FROM portfolio ORDER BY account_id");
}
