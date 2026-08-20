// Accounts are token-first: the extension generates nothing, the server issues
// an opaque token on first use and the extension stores it. Email is optional
// and only needed for alerts; there is no password anywhere.

import { randomUUID } from "node:crypto";
import { query, run } from "./db";
import type { Lang } from "./i18n";

export type Plan = "free" | "pro";

export interface Account {
  id: number;
  token: string;
  email: string | null;
  plan: Plan;
  telegram_chat_id: string | null;
  telegram_link_code: string | null;
  lang: Lang;
}

export interface PlanLimits {
  portfolioItems: number;
  bulkPerDay: number;
  instantAlerts: boolean;
  intel: boolean;
}

export const LIMITS: Record<Plan, PlanLimits> = {
  // The free tier must stay genuinely useful: a red verdict is never paywalled.
  free: { portfolioItems: 3, bulkPerDay: 100, instantAlerts: false, intel: false },
  pro: { portfolioItems: 500, bulkPerDay: 100_000, instantAlerts: true, intel: true },
};

export function limitsFor(plan: Plan): PlanLimits {
  return LIMITS[plan] ?? LIMITS.free;
}

function rowToAccount(r: Record<string, unknown>): Account {
  return {
    id: Number(r.id),
    token: String(r.token),
    email: (r.email as string) ?? null,
    plan: (r.plan as Plan) ?? "free",
    telegram_chat_id: (r.telegram_chat_id as string) ?? null,
    telegram_link_code: (r.telegram_link_code as string) ?? null,
    lang: (r.lang as Lang) ?? "en",
  };
}

export async function getAccountByToken(token: string): Promise<Account | null> {
  if (!token || token.length < 8) return null;
  const rows = await query<Record<string, unknown>>("SELECT * FROM accounts WHERE token = ?", [token]);
  if (rows.length === 0) return null;
  await run("UPDATE accounts SET last_seen_at = datetime('now') WHERE token = ?", [token]);
  return rowToAccount(rows[0]);
}

export async function createAccount(lang: Lang = "en"): Promise<Account> {
  const token = `tr_${randomUUID().replace(/-/g, "")}`;
  const linkCode = randomUUID().slice(0, 8);
  await run(
    "INSERT INTO accounts (token, lang, telegram_link_code, last_seen_at) VALUES (?, ?, ?, datetime('now'))",
    [token, lang, linkCode]
  );
  const acc = await getAccountByToken(token);
  if (!acc) throw new Error("account creation failed");
  return acc;
}

/** Resolve an existing account or mint a fresh one. */
export async function getOrCreateAccount(token: string | null, lang: Lang = "en"): Promise<Account> {
  if (token) {
    const existing = await getAccountByToken(token);
    if (existing) return existing;
  }
  return createAccount(lang);
}

export async function updateAccount(
  id: number,
  fields: { email?: string; lang?: Lang; plan?: Plan; telegram_chat_id?: string | null }
): Promise<void> {
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    sets.push(`${k} = ?`);
    args.push(v as string | null);
  }
  if (sets.length === 0) return;
  args.push(id);
  await run(`UPDATE accounts SET ${sets.join(", ")} WHERE id = ?`, args);
}

export async function getAccountByTelegramCode(code: string): Promise<Account | null> {
  const rows = await query<Record<string, unknown>>(
    "SELECT * FROM accounts WHERE telegram_link_code = ?",
    [code]
  );
  return rows.length ? rowToAccount(rows[0]) : null;
}

/** Count of bulk-checked titles today, for free-tier rate limiting. */
export async function bulkUsageToday(accountId: number): Promise<number> {
  const rows = await query<{ value: string }>(
    "SELECT value FROM sync_state WHERE key = ?",
    [`bulk:${accountId}:${new Date().toISOString().slice(0, 10)}`]
  );
  return Number(rows[0]?.value ?? 0);
}

export async function addBulkUsage(accountId: number, n: number): Promise<void> {
  const key = `bulk:${accountId}:${new Date().toISOString().slice(0, 10)}`;
  await run(
    `INSERT INTO sync_state (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(sync_state.value AS INTEGER) + ? AS TEXT)`,
    [key, String(n), n]
  );
}
