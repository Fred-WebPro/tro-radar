// Pull Schedule A cases from CourtListener into the database.
//
//   npm run ingest                 incremental (since last synced filing date - 3 days,
//                                  or the last 365 days on first run)
//   npm run ingest -- --since 2023-01-01     explicit backfill window
//   npm run ingest -- --max-pages 50         cap pages for a bounded run
//
// Writes to the local SQLite file by default, or to Turso when
// TURSO_DATABASE_URL / TURSO_AUTH_TOKEN are set.

import { searchScheduleA } from "../src/lib/courtlistener";
import { upsertCases, countCases, getSyncState, setSyncState } from "../src/lib/repo";

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 86_400_000);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const explicitSince = argValue("--since");
  const maxPages = argValue("--max-pages") ? Number(argValue("--max-pages")) : undefined;

  let since = explicitSince;
  if (!since) {
    const lastFiled = await getSyncState("last_filed_date");
    // Overlap 3 days so late-docketed filings are not missed.
    since = lastFiled
      ? new Date(new Date(lastFiled).getTime() - 3 * 86_400_000).toISOString().slice(0, 10)
      : daysAgo(365);
  }

  console.log(`Ingesting Schedule A cases filed since ${since}...`);
  const before = await countCases();
  let processed = 0;
  let newestFiled = (await getSyncState("last_filed_date")) ?? "";

  for await (const { results, count, page } of searchScheduleA({ since, maxPages })) {
    processed += await upsertCases(results);
    for (const c of results) {
      if (c.dateFiled && c.dateFiled > newestFiled) newestFiled = c.dateFiled;
    }
    if (page === 1) console.log(`API reports ${count} matching dockets.`);
    if (page % 10 === 0) console.log(`  page ${page}: ${processed} cases processed`);
  }

  const after = await countCases();
  if (newestFiled) await setSyncState("last_filed_date", newestFiled);
  await setSyncState("last_ingest_at", new Date().toISOString());
  console.log(`Done. ${after - before} new cases, ${processed - (after - before)} updated.`);
}

main().catch((err) => {
  console.error("Ingest failed:", err.message);
  process.exit(1);
});
