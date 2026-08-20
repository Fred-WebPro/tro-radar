// Portfolio monitoring run. Vercel Cron hits this after each data sync so
// alerts land the same day a case is filed.
//
//   GET /api/cron/monitor            all accounts
//   GET /api/cron/monitor?instant=1  Pro accounts only (runs more often)

import { NextResponse } from "next/server";
import { runMonitor } from "@/lib/monitor";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const instantOnly = new URL(req.url).searchParams.get("instant") === "1";
  try {
    const result = await runMonitor({ instantOnly });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Monitor failed" },
      { status: 500 }
    );
  }
}
