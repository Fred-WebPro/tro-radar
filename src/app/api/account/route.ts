// Account bootstrap and settings. The extension calls this on install with no
// token and stores whatever it gets back.

import { NextResponse } from "next/server";
import { getOrCreateAccount, updateAccount, limitsFor } from "@/lib/accounts";
import { countPortfolio } from "@/lib/portfolio";
import { CORS_HEADERS, corsPreflight } from "@/lib/cors";
import { isLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: Request) {
  let body: { email?: string; lang?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* an empty body is a valid "just give me a token" call */
  }

  const token = req.headers.get("x-tro-token");
  const lang = body.lang && isLang(body.lang) ? body.lang : "en";
  const account = await getOrCreateAccount(token, lang);

  const email = body.email?.trim();
  if (email !== undefined && email !== "") {
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400, headers: CORS_HEADERS });
    }
    await updateAccount(account.id, { email, lang });
    account.email = email;
  } else if (body.lang) {
    await updateAccount(account.id, { lang });
  }

  const limits = limitsFor(account.plan);
  return NextResponse.json(
    {
      token: account.token,
      email: account.email,
      plan: account.plan,
      lang: account.lang,
      telegram_linked: Boolean(account.telegram_chat_id),
      telegram_link_code: account.telegram_link_code,
      limits,
      portfolio_count: await countPortfolio(account.id),
    },
    { headers: CORS_HEADERS }
  );
}
