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
`;

let client: Client | null = null;
let ready: Promise<Client> | null = null;

async function init(): Promise<Client> {
  const url = process.env.TURSO_DATABASE_URL ?? "file:data/troradar.db";
  const isFile = url.startsWith("file:");
  if (isFile) {
    const p = url.slice("file:".length);
    fs.mkdirSync(path.dirname(path.resolve(process.cwd(), p)), { recursive: true });
  }
  const c = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  if (isFile) {
    await c.execute("PRAGMA journal_mode = WAL");
    await c.execute("PRAGMA busy_timeout = 5000");
  }
  await c.executeMultiple(SCHEMA);
  // Migration for databases created before unsubscribe_token existed.
  try {
    await c.execute("ALTER TABLE subscriptions ADD COLUMN unsubscribe_token TEXT");
  } catch {
    /* column already exists */
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
