// Cursor-resumable ingest: pulls Schedule A cases from CourtListener in
// bounded chunks so it can run inside a serverless function. A partially
// completed crawl stores its `next` cursor in sync_state and the following
// call picks up where it left off.

import { buildSearchUrl, fetchPage, sleep, PAGE_DELAY_MS } from "./courtlistener";
import { upsertCases, countCases, getSyncState, setSyncState } from "./repo";

export interface IngestResult {
  done: boolean;
  pages: number;
  processed: number;
  newCases: number;
  totalReported: number | null;
  newestFiled: string | null;
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Run up to `maxPages` pages of the crawl (each page = 20 cases + a polite
 * delay). Returns done=false when a cursor remains — call again to continue.
 */
export async function runIngest(opts: { maxPages?: number; since?: string } = {}): Promise<IngestResult> {
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
