// Chunked data sync, designed for Vercel Cron (daily) and for manual
// seeding: each call processes up to `pages` pages (20 cases each) and
// stores a resume cursor, so repeated calls walk through a full backfill.
//
//   GET /api/cron/ingest            -> one chunk of the pending crawl
//   GET /api/cron/ingest?pages=15   -> bigger chunk (max 20)
//
// If CRON_SECRET is set, requests must carry "Authorization: Bearer <secret>"
// (Vercel Cron adds this header automatically).

import { NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const pagesParam = Number(params.get("pages") ?? "10");
  const maxPages = Math.min(Math.max(1, pagesParam || 10), 20);
  // Optional backfill window; only takes effect when starting a fresh crawl
  // (an in-progress cursor always continues first).
  const sinceParam = params.get("since") ?? undefined;
  const since = sinceParam && /^\d{4}-\d{2}-\d{2}$/.test(sinceParam) ? sinceParam : undefined;

  try {
    const result = await runIngest({ maxPages, since });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ingest failed" },
      { status: 500 }
    );
  }
}
