// Single database layer for both environments:
//  - local dev: an SQLite file (default ./data/troradar.db)
//  - production: Turso/libSQL over the network (set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN)

import { createClient, type Client, type InStatement } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cases (
  docket_id INTEGER PRIMARY KEY,
  case_name TEXT NOT NULL,
  plaintiff TEXT NOT NULL,
  brand TEXT NOT NULL,
  brand_norm TEXT NOT NULL,
  court_id TEXT NOT NULL,
  court TEXT NOT NULL,
  docket_number TEXT,
  date_filed TEXT NOT NULL,
  date_terminated TEXT,
  absolute_url TEXT NOT NULL,
  pacer_case_id TEXT,
  parties TEXT,
  firms TEXT,
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cases_date_filed ON cases(date_filed DESC);
CREATE INDEX IF NOT EXISTS idx_cases_brand_norm ON cases(brand_norm);
CREATE INDEX IF NOT EXISTS idx_cases_active ON cases(date_filed) WHERE date_terminated IS NULL;

CREATE VIRTUAL TABLE IF NOT EXISTS cases_fts USING fts5(
  case_name, plaintiff, brand,
  content='cases', content_rowid='docket_id', tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS cases_ai AFTER INSERT ON cases BEGIN
  INSERT INTO cases_fts(rowid, case_name, plaintiff, brand)
  VALUES (new.docket_id, new.case_name, new.plaintiff, new.brand);
END;
CREATE TRIGGER IF NOT EXISTS cases_ad AFTER DELETE ON cases BEGIN
  INSERT INTO cases_fts(cases_fts, rowid, case_name, plaintiff, brand)
  VALUES ('delete', old.docket_id, old.case_name, old.plaintiff, old.brand);
END;
CREATE TRIGGER IF NOT EXISTS cases_au AFTER UPDATE ON cases BEGIN
  INSERT INTO cases_fts(cases_fts, rowid, case_name, plaintiff, brand)
  VALUES ('delete', old.docket_id, old.case_name, old.plaintiff, old.brand);
  INSERT INTO cases_fts(rowid, case_name, plaintiff, brand)
  VALUES (new.docket_id, new.case_name, new.plaintiff, new.brand);
END;

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  query TEXT NOT NULL,
  unsubscribe_token TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_notified_at TEXT,
  UNIQUE(email, query)
);

CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Law firms per docket, normalized so "Greer, Burns, and Crain" and
-- "Greer, Burns & Crain Ltd." aggregate into one serial filer.
CREATE TABLE IF NOT EXISTS case_firms (
  docket_id INTEGER NOT NULL,
  firm TEXT NOT NULL,
  firm_norm TEXT NOT NULL,
  PRIMARY KEY (docket_id, firm_norm)
);
CREATE INDEX IF NOT EXISTS idx_case_firms_norm ON case_firms(firm_norm);

-- A workspace is one user, identified by an opaque token the extension stores.
-- No password: the token IS the credential, emailed as a magic link.
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  email TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  telegram_chat_id TEXT,
  telegram_link_code TEXT,
  lang TEXT NOT NULL DEFAULT 'en',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);

-- Products the user actually sells or plans to source. Checked against every
-- new filing on each sync.
CREATE TABLE IF NOT EXISTS portfolio (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  image TEXT,
  source TEXT,
  last_verdict TEXT,
  last_active_cases INTEGER NOT NULL DEFAULT 0,
  last_checked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(account_id, title)
);
CREATE INDEX IF NOT EXISTS idx_portfolio_account ON portfolio(account_id);

-- Alerts already delivered, so a re-check never notifies twice for the same case.
CREATE TABLE IF NOT EXISTS portfolio_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  portfolio_id INTEGER NOT NULL,
  docket_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(portfolio_id, docket_id)
);
`;

// Bump when SCHEMA gains a table, so existing databases re-run the DDL once.
// The newest table doubles as the sentinel: if it exists, the schema is current
// and DDL is skipped — which keeps cold starts fast and, locally, avoids taking
// a write lock the dev server may already hold.
const SCHEMA_SENTINEL = "portfolio_alerts";

let client: Client | null = null;
let ready: Promise<Client> | null = null;

async function isSchemaCurrent(c: Client): Promise<boolean> {
  try {
    const rs = await c.execute({
      sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
      args: [SCHEMA_SENTINEL],
    });
    return rs.rows.length > 0;
  } catch {
    return false;
  }
}

async function init(): Promise<Client> {
  const url =
    process.env.TURSO_DATABASE_URL ?? process.env.TURSO_URL ?? "file:data/troradar.db";
  const isFile = url.startsWith("file:");
  if (isFile) {
    const p = url.slice("file:".length);
    fs.mkdirSync(path.dirname(path.resolve(process.cwd(), p)), { recursive: true });
  }
  const c = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN ?? process.env.TURSO_TOKEN,
  });
  if (isFile) {
    await c.execute("PRAGMA busy_timeout = 5000");
  }

  if (!(await isSchemaCurrent(c))) {
    if (isFile) await c.execute("PRAGMA journal_mode = WAL");
    await c.executeMultiple(SCHEMA);
    // Migrations for databases created before these columns existed.
    for (const sql of [
      "ALTER TABLE subscriptions ADD COLUMN unsubscribe_token TEXT",
      "ALTER TABLE cases ADD COLUMN firms TEXT",
    ]) {
      try {
        await c.execute(sql);
      } catch {
        /* column already exists */
      }
    }
  }
  client = c;
  return c;
}

export function getDb(): Promise<Client> {
  if (client) return Promise.resolve(client);
  if (!ready) ready = init();
  return ready;
}

export async function query<T>(sql: string, args: (string | number | null)[] = []): Promise<T[]> {
  const db = await getDb();
  const rs = await db.execute({ sql, args });
  return rs.rows as unknown as T[];
}

export async function run(sql: string, args: (string | number | null)[] = []): Promise<void> {
  const db = await getDb();
  await db.execute({ sql, args });
}

export async function batch(statements: InStatement[]): Promise<void> {
  if (statements.length === 0) return;
  const db = await getDb();
  await db.batch(statements, "write");
}

/** Run many reads in a single round trip — the difference between 60 network
 *  hops and one when scanning a whole page of search results. */
export async function batchQuery<T>(statements: InStatement[]): Promise<T[][]> {
  if (statements.length === 0) return [];
  const db = await getDb();
  const results = await db.batch(statements, "read");
  return results.map((rs) => rs.rows as unknown as T[]);
}
