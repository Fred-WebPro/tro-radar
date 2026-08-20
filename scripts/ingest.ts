// CLI wrapper around the chunked ingest.
//
//   npm run ingest                 incremental (since last synced filing date - 3 days,
//                                  or the last 365 days on first run)
//   npm run ingest -- --since 2023-01-01     explicit backfill window
//   npm run ingest -- --max-pages 50         cap total pages for a bounded run
//
// Writes to the local SQLite file by default, or to Turso when
// TURSO_DATABASE_URL / TURSO_AUTH_TOKEN are set.

import { runIngest } from "../src/lib/ingest";

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const since = argValue("--since");
  const cap = argValue("--max-pages") ? Number(argValue("--max-pages")) : Infinity;

  let totalPages = 0;
  let totalNew = 0;
  for (;;) {
    const chunk = await runIngest({ maxPages: Math.min(10, cap - totalPages), since });
    if (chunk.locked) {
      console.log("Another ingest is running; retrying in 60s…");
      await new Promise((r) => setTimeout(r, 60_000));
      continue;
    }
    totalPages += chunk.pages;
    totalNew += chunk.newCases;
    if (chunk.totalReported !== null && totalPages <= chunk.pages) {
      console.log(`API reports ${chunk.totalReported} matching dockets.`);
    }
    console.log(`  ${totalPages} pages done, ${totalNew} new cases`);
    if (chunk.done || totalPages >= cap) break;
  }
  console.log(`Done. ${totalNew} new cases across ${totalPages} pages.`);
}

main().catch((err) => {
  console.error("Ingest failed:", err.message);
  process.exit(1);
});
