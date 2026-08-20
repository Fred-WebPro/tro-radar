// JSON risk check — the endpoint a future browser extension will call.
// GET /api/check?q=harley+davidson

import { NextResponse } from "next/server";
import { searchCases, groupByBrand } from "@/lib/repo";
import { assessRisk } from "@/lib/risk";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  const matches = await searchCases(q);
  const groups = groupByBrand(matches);
  const risk = assessRisk(matches, groups);

  return NextResponse.json({
    query: q,
    verdict: risk.verdict,
    headline: risk.headline,
    detail: risk.detail,
    active_cases: risk.activeCount,
    closed_cases: risk.closedCount,
    last_filed: risk.lastFiled,
    brands: groups.slice(0, 10),
    cases: matches.slice(0, 20).map((c) => ({
      docket_id: c.docket_id,
      case_name: c.case_name,
      brand: c.brand,
      court: c.court,
      docket_number: c.docket_number,
      date_filed: c.date_filed,
      date_terminated: c.date_terminated,
      courtlistener_url: c.absolute_url,
    })),
    disclaimer:
      "Public court records via CourtListener/RECAP. Not legal advice; absence of matches is not a guarantee of safety.",
  });
}
