import { randomUUID } from "node:crypto";
import type { InStatement } from "@libsql/client";
import { query, run, batch, batchQuery } from "./db";
import { extractPlaintiff, extractBrand, normalizeBrand } from "./brands";
import { normalizeFirm } from "./firms";
import { isPlausibleBrandMatch } from "./match";
import type { CLCase } from "./courtlistener";

export interface CaseRow {
  docket_id: number;
  case_name: string;
  plaintiff: string;
  brand: string;
  brand_norm: string;
  court_id: string;
  court: string;
  docket_number: string | null;
  date_filed: string;
  date_terminated: string | null;
  absolute_url: string;
  pacer_case_id: string | null;
  parties: string | null;
  firms: string | null;
}

export interface BrandGroup {
  brand: string;
  brand_norm: string;
  total: number;
  active: number;
  last_filed: string;
}

const UPSERT_SQL = `INSERT INTO cases (docket_id, case_name, plaintiff, brand, brand_norm, court_id, court,
    docket_number, date_filed, date_terminated, absolute_url, pacer_case_id, parties, firms)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(docket_id) DO UPDATE SET
    case_name = excluded.case_name,
    plaintiff = excluded.plaintiff,
    brand = excluded.brand,
    brand_norm = excluded.brand_norm,
    docket_number = excluded.docket_number,
    date_filed = excluded.date_filed,
    date_terminated = excluded.date_terminated,
    -- Firm data arrives later, once RECAP pulls the full docket; never
    -- overwrite what we have with an empty list.
    firms = COALESCE(NULLIF(excluded.firms, '[]'), cases.firms),
    updated_at = datetime('now')`;

function upsertStatement(c: CLCase): InStatement | null {
  if (!c.dateFiled) return null;
  const plaintiff = extractPlaintiff(c.caseName);
  const brand = extractBrand(plaintiff);
  return {
    sql: UPSERT_SQL,
    args: [
      c.docket_id,
      c.caseName,
      plaintiff,
      brand,
      normalizeBrand(brand),
      c.court_id,
      c.court,
      c.docketNumber,
      c.dateFiled,
      c.dateTerminated,
      `https://www.courtlistener.com${c.docket_absolute_url}`,
      c.pacer_case_id,
      JSON.stringify(c.party ?? []),
      JSON.stringify(c.firm ?? []),
    ],
  };
}

const FIRM_SQL = `INSERT INTO case_firms (docket_id, firm, firm_norm) VALUES (?, ?, ?)
  ON CONFLICT(docket_id, firm_norm) DO NOTHING`;

/** Upsert a page of cases in one round trip. Returns how many were processed. */
export async function upsertCases(cases: CLCase[]): Promise<number> {
  const stmts = cases.map(upsertStatement).filter((s): s is InStatement => s !== null);
  for (const c of cases) {
    for (const firm of c.firm ?? []) {
      const norm = normalizeFirm(firm);
      if (norm) stmts.push({ sql: FIRM_SQL, args: [c.docket_id, firm, norm] });
    }
  }
  await batch(stmts);
  return stmts.length;
}

export async function countCases(): Promise<number> {
  const rows = await query<{ n: number }>("SELECT COUNT(*) AS n FROM cases");
  return Number(rows[0]?.n ?? 0);
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "this", "that", "not", "are", "was",
]);

/** Turn free text into a safe FTS5 OR-query of quoted tokens. */
function toFtsQuery(q: string): string | null {
  const tokens = q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  if (tokens.length === 0) return null;
  return tokens.map((t) => `"${t}"`).join(" OR ");
}

export async function searchCases(q: string, limit = 60): Promise<CaseRow[]> {
  const fts = toFtsQuery(q);
  if (!fts) return [];
  // Over-fetch, then apply the precision filter: full-text retrieval alone
  // matches any shared word and would flag half the catalogue.
  const rows = await query<CaseRow>(
    `SELECT c.* FROM cases_fts f
     JOIN cases c ON c.docket_id = f.rowid
     WHERE cases_fts MATCH ?
     ORDER BY bm25(cases_fts, 1.0, 5.0, 10.0),
       (c.date_terminated IS NULL) DESC, c.date_filed DESC
     LIMIT ?`,
    [fts, Math.max(limit * 5, 300)]
  );

  const verdict = new Map<string, boolean>();
  return rows
    .filter((r) => {
      let ok = verdict.get(r.brand_norm);
      if (ok === undefined) {
        ok = isPlausibleBrandMatch(q, r.brand);
        verdict.set(r.brand_norm, ok);
      }
      return ok;
    })
    .slice(0, limit);
}

/**
 * Verdict-level lookup for many titles at once. Returns brand groups only —
 * enough to colour a badge — in a single database round trip.
 */
export async function searchBrandGroupsBulk(queries: string[]): Promise<BrandGroup[][]> {
  const sql = `SELECT c.brand AS brand, c.brand_norm AS brand_norm,
      COUNT(*) AS total,
      SUM(CASE WHEN c.date_terminated IS NULL THEN 1 ELSE 0 END) AS active,
      MAX(c.date_filed) AS last_filed
    FROM cases_fts f
    JOIN cases c ON c.docket_id = f.rowid
    WHERE cases_fts MATCH ?
    GROUP BY c.brand_norm
    ORDER BY active DESC, total DESC
    LIMIT 12`;

  const ftsQueries = queries.map(toFtsQuery);
  const statements = ftsQueries
    .filter((f): f is string => f !== null)
    .map((fts) => ({ sql, args: [fts] }));

  const results = await batchQuery<BrandGroup>(statements);

  // Re-align results with the original list: unmatched titles get no groups.
  const out: BrandGroup[][] = [];
  let i = 0;
  ftsQueries.forEach((fts, qi) => {
    if (fts === null) {
      out.push([]);
      return;
    }
    const groups = (results[i++] ?? [])
      .map((g) => ({ ...g, total: Number(g.total), active: Number(g.active) }))
      // Same precision filter as searchCases — a shared word is not a brand.
      .filter((g) => isPlausibleBrandMatch(queries[qi], g.brand))
      .slice(0, 5);
    out.push(groups);
  });
  return out;
}

export function groupByBrand(rows: CaseRow[]): BrandGroup[] {
  const map = new Map<string, BrandGroup>();
  for (const r of rows) {
    const g = map.get(r.brand_norm) ?? {
      brand: r.brand,
      brand_norm: r.brand_norm,
      total: 0,
      active: 0,
      last_filed: r.date_filed,
    };
    g.total++;
    if (!r.date_terminated) g.active++;
    if (r.date_filed > g.last_filed) g.last_filed = r.date_filed;
    map.set(r.brand_norm, g);
  }
  return [...map.values()].sort((a, b) => b.active - a.active || b.total - a.total);
}

export async function getCase(docketId: number): Promise<CaseRow | undefined> {
  const rows = await query<CaseRow>("SELECT * FROM cases WHERE docket_id = ?", [docketId]);
  return rows[0];
}

export async function casesByBrandNorm(brandNorm: string, limit = 100): Promise<CaseRow[]> {
  return query<CaseRow>(
    `SELECT * FROM cases WHERE brand_norm = ?
     ORDER BY (date_terminated IS NULL) DESC, date_filed DESC LIMIT ?`,
    [brandNorm, limit]
  );
}

export async function recentCases(limit = 50): Promise<CaseRow[]> {
  return query<CaseRow>(
    "SELECT * FROM cases ORDER BY date_filed DESC, docket_id DESC LIMIT ?",
    [limit]
  );
}

export interface Stats {
  total: number;
  active: number;
  last30d: number;
  brands: number;
  earliest: string | null;
  latest: string | null;
}

export async function getStats(): Promise<Stats> {
  const rows = await query<Record<string, number | string | null>>(
    `SELECT COUNT(*) AS total,
       SUM(CASE WHEN date_terminated IS NULL THEN 1 ELSE 0 END) AS active,
       SUM(CASE WHEN date_filed >= date('now', '-30 days') THEN 1 ELSE 0 END) AS last30d,
       COUNT(DISTINCT brand_norm) AS brands,
       MIN(date_filed) AS earliest, MAX(date_filed) AS latest
     FROM cases`
  );
  const row = rows[0] ?? {};
  return {
    total: Number(row.total ?? 0),
    active: Number(row.active ?? 0),
    last30d: Number(row.last30d ?? 0),
    brands: Number(row.brands ?? 0),
    earliest: (row.earliest as string) ?? null,
    latest: (row.latest as string) ?? null,
  };
}

export interface PlaintiffRow {
  brand: string;
  brand_norm: string;
  total: number;
  active: number;
  last_filed: string;
}

export async function topPlaintiffs(limit = 15): Promise<PlaintiffRow[]> {
  const rows = await query<PlaintiffRow>(
    `SELECT brand, brand_norm, COUNT(*) AS total,
       SUM(CASE WHEN date_terminated IS NULL THEN 1 ELSE 0 END) AS active,
       MAX(date_filed) AS last_filed
     FROM cases GROUP BY brand_norm
     ORDER BY total DESC LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({ ...r, total: Number(r.total), active: Number(r.active) }));
}

export async function monthlyCounts(months = 12): Promise<{ month: string; total: number }[]> {
  const rows = await query<{ month: string; total: number }>(
    `SELECT substr(date_filed, 1, 7) AS month, COUNT(*) AS total
     FROM cases
     WHERE date_filed >= date('now', 'start of month', ?)
     GROUP BY month ORDER BY month`,
    [`-${months - 1} months`]
  );
  return rows.map((r) => ({ month: r.month, total: Number(r.total) }));
}

export async function addSubscription(email: string, q: string): Promise<void> {
  await run(
    `INSERT INTO subscriptions (email, query, unsubscribe_token) VALUES (?, ?, ?)
     ON CONFLICT(email, query) DO NOTHING`,
    [email.toLowerCase().trim(), q.trim(), randomUUID()]
  );
}

export async function removeSubscriptionByToken(token: string): Promise<boolean> {
  const rows = await query<{ id: number }>(
    "SELECT id FROM subscriptions WHERE unsubscribe_token = ?",
    [token]
  );
  if (rows.length === 0) return false;
  await run("DELETE FROM subscriptions WHERE unsubscribe_token = ?", [token]);
  return true;
}

export async function getSyncState(key: string): Promise<string | null> {
  const rows = await query<{ value: string }>("SELECT value FROM sync_state WHERE key = ?", [key]);
  return rows[0]?.value ?? null;
}

export async function setSyncState(key: string, value: string): Promise<void> {
  await run(
    `INSERT INTO sync_state (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}
