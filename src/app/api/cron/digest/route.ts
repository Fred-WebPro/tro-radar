// Daily watchlist digest, designed for Vercel Cron.
// If CRON_SECRET is set, requests must carry "Authorization: Bearer <secret>".

import { NextResponse } from "next/server";
import { runDigest } from "@/lib/digest";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDigest();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Digest failed" },
      { status: 500 }
    );
  }
}
