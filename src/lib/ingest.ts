// Cursor-resumable ingest: pulls Schedule A cases from CourtListener in
// bounded chunks so it can run inside a serverless function. A partially
// completed crawl stores its `next` cursor in sync_state and the following
// call picks up where it left off.

import { buildSearchUrl, fetchPage, sleep, PAGE_DELAY_MS } from "./courtlistener";
import { getDb } from "./db";
import { upsertCases, countCases, getSyncState, setSyncState } from "./repo";

export interface IngestResult {
  done: boolean;
  locked?: boolean;
  pages: number;
  processed: number;
  newCases: number;
  totalReported: number | null;
  newestFiled: string | null;
}

// Concurrent crawls fight over the shared cursor and burn the CourtListener
// rate budget, so only one runs at a time. The lock is an atomic conditional
// UPDATE on sync_state; a stale lock (crashed run) expires after 6 minutes,
// comfortably past the 5-minute serverless execution cap.
const LOCK_TTL_MS = 6 * 60_000;

async function acquireLock(): Promise<boolean> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO sync_state (key, value) VALUES ('ingest_lock', '') ON CONFLICT(key) DO NOTHING"
  );
  const rs = await db.execute({
    sql: "UPDATE sync_state SET value = ? WHERE key = 'ingest_lock' AND (value = '' OR value < ?)",
    args: [new Date().toISOString(), new Date(Date.now() - LOCK_TTL_MS).toISOString()],
  });
  return rs.rowsAffected > 0;
}

async function releaseLock(): Promise<void> {
  await setSyncState("ingest_lock", "");
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Run up to `maxPages` pages of the crawl (each page = 20 cases + a polite
 * delay). Returns done=false when a cursor remains — call again to continue.
 */
export async function runIngest(opts: { maxPages?: number; since?: string } = {}): Promise<IngestResult> {
  if (!(await acquireLock())) {
    return { done: false, locked: true, pages: 0, processed: 0, newCases: 0, totalReported: null, newestFiled: null };
  }
  try {
    return await crawl(opts);
  } finally {
    await releaseLock();
  }
}

async function crawl(opts: { maxPages?: number; since?: string }): Promise<IngestResult> {
  const maxPages = opts.maxPages ?? 10;
  const before = await countCases();

  let url = await getSyncState("ingest_cursor");
  let newestFiled = (await getSyncState("crawl_newest_filed")) ?? "";
  if (!url) {
    let since = opts.since;
    if (!since) {
      const lastFiled = await getSyncState("last_filed_date");
      // Overlap 3 days so late-docketed filings are not missed.
      since = lastFiled
        ? new Date(new Date(lastFiled).getTime() - 3 * 86_400_000).toISOString().slice(0, 10)
        : daysAgo(365);
    }
    url = buildSearchUrl(since);
    newestFiled = "";
  }

  let pages = 0;
  let processed = 0;
  let totalReported: number | null = null;

  while (url && pages < maxPages) {
    const page = await fetchPage(url);
    processed += await upsertCases(page.results);
    pages++;
    totalReported = page.count;
    for (const c of page.results) {
      if (c.dateFiled && c.dateFiled > newestFiled) newestFiled = c.dateFiled;
    }
    url = page.next;
    // Persist progress after every page so an interrupted run resumes safely.
    await setSyncState("ingest_cursor", url ?? "");
    await setSyncState("crawl_newest_filed", newestFiled);
    if (url) await sleep(PAGE_DELAY_MS);
  }

  const done = !url;
  if (done) {
    // Self-heal rows written before firm names were validated ("Il", "LLC").
    const db = await getDb();
    await db.execute("DELETE FROM case_firms WHERE LENGTH(firm_norm) < 4");
    const lastFiled = (await getSyncState("last_filed_date")) ?? "";
    if (newestFiled > lastFiled) await setSyncState("last_filed_date", newestFiled);
    await setSyncState("ingest_cursor", "");
    await setSyncState("crawl_newest_filed", "");
    await setSyncState("last_ingest_at", new Date().toISOString());
  }

  const after = await countCases();
  return {
    done,
    pages,
    processed,
    newCases: after - before,
    totalReported,
    newestFiled: newestFiled || null,
  };
}
