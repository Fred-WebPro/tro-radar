// Verdicts for a whole page of search results in one request. This is what
// lets the extension paint traffic lights across an AliExpress/Temu SERP.
//
//   POST { titles: ["...", "..."] }  ->  { results: [{ verdict, active, brand }] }

import { NextResponse } from "next/server";
import { searchBrandGroupsBulk } from "@/lib/repo";
import { getOrCreateAccount, limitsFor, bulkUsageToday, addBulkUsage } from "@/lib/accounts";
import { CORS_HEADERS, corsPreflight } from "@/lib/cors";

export const dynamic = "force-dynamic";

const MAX_TITLES = 80;

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: Request) {
  let body: { titles?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
  }

  const titles = Array.isArray(body.titles)
    ? body.titles.filter((t): t is string => typeof t === "string").slice(0, MAX_TITLES)
    : [];
  if (titles.length === 0) {
    return NextResponse.json({ error: "No titles" }, { status: 400, headers: CORS_HEADERS });
  }

  const token = req.headers.get("x-tro-token");
  const account = await getOrCreateAccount(token);
  const limits = limitsFor(account.plan);

  const used = await bulkUsageToday(account.id);
  const remaining = Math.max(0, limits.bulkPerDay - used);
  if (remaining === 0) {
    return NextResponse.json(
      { error: "daily_limit", limit: limits.bulkPerDay, plan: account.plan, token: account.token },
      { status: 429, headers: CORS_HEADERS }
    );
  }

  const allowed = titles.slice(0, remaining);
  const groupsPerTitle = await searchBrandGroupsBulk(allowed);
  await addBulkUsage(account.id, allowed.length);

  const results = groupsPerTitle.map((groups, i) => {
    const active = groups.reduce((n, g) => n + g.active, 0);
    const total = groups.reduce((n, g) => n + g.total, 0);
    const top = groups[0];
    return {
      title: allowed[i],
      verdict: active > 0 ? "red" : total > 0 ? "yellow" : "green",
      active_cases: active,
      total_cases: total,
      brand: top?.brand ?? null,
    };
  });

  return NextResponse.json(
    {
      results,
      token: account.token,
      plan: account.plan,
      quota: { used: used + allowed.length, limit: limits.bulkPerDay },
      truncated: allowed.length < titles.length,
    },
    { headers: CORS_HEADERS }
  );
}
