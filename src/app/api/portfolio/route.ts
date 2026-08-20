// Portfolio CRUD. Every call is authenticated by the opaque account token in
// the X-TRO-Token header.

import { NextResponse } from "next/server";
import { getAccountByToken, limitsFor } from "@/lib/accounts";
import {
  listPortfolio,
  addPortfolioItem,
  removePortfolioItem,
  countPortfolio,
} from "@/lib/portfolio";
import { CORS_HEADERS, corsPreflight } from "@/lib/cors";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

async function auth(req: Request) {
  const token = req.headers.get("x-tro-token");
  if (!token) return null;
  return getAccountByToken(token);
}

export async function GET(req: Request) {
  const account = await auth(req);
  if (!account) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }
  const limits = limitsFor(account.plan);
  const items = await listPortfolio(account.id);
  return NextResponse.json(
    {
      items,
      plan: account.plan,
      limit: limits.portfolioItems,
      at_risk: items.filter((i) => i.last_verdict === "red").length,
    },
    { headers: CORS_HEADERS }
  );
}

export async function POST(req: Request) {
  const account = await auth(req);
  if (!account) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  let body: { title?: string; url?: string; image?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
  }
  if (!body.title || body.title.trim().length < 3) {
    return NextResponse.json({ error: "Title too short" }, { status: 400, headers: CORS_HEADERS });
  }

  const limits = limitsFor(account.plan);
  if ((await countPortfolio(account.id)) >= limits.portfolioItems) {
    return NextResponse.json(
      { error: "plan_limit", limit: limits.portfolioItems, plan: account.plan },
      { status: 402, headers: CORS_HEADERS }
    );
  }

  const item = await addPortfolioItem(
    account.id,
    { title: body.title, url: body.url, image: body.image, source: body.source },
    account.lang
  );
  return NextResponse.json({ item }, { headers: CORS_HEADERS });
}

export async function DELETE(req: Request) {
  const account = await auth(req);
  if (!account) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Bad id" }, { status: 400, headers: CORS_HEADERS });
  }
  await removePortfolioItem(account.id, id);
  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
