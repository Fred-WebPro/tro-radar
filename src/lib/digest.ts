// Watchlist digests: for every subscription, find matching cases filed since
// the last notification and email them. With RESEND_API_KEY set, emails go
// out via Resend; without it they are printed to the console so the pipeline
// can be tested end-to-end.

import { query, run } from "./db";
import { searchCases } from "./repo";
import { SITE_URL } from "./site";

interface Sub {
  id: number;
  email: string;
  query: string;
  unsubscribe_token: string | null;
  last_notified_at: string | null;
  created_at: string;
}

async function send(to: string, subject: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n--- would send to ${to} ---\nSubject: ${subject}\n${text}\n---`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.DIGEST_FROM ?? "TRO Radar <onboarding@resend.dev>",
      to,
      subject,
      text,
    }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
}

export async function runDigest(): Promise<{ subscriptions: number; notified: number }> {
  const subs = await query<Sub>("SELECT * FROM subscriptions");
  let notified = 0;

  for (const sub of subs) {
    const cutoff = (sub.last_notified_at ?? sub.created_at).slice(0, 10);
    const fresh = (await searchCases(sub.query)).filter((c) => c.date_filed > cutoff);
    if (fresh.length === 0) continue;

    const lines = fresh
      .slice(0, 20)
      .map((c) => `• ${c.date_filed}  ${c.brand} — ${c.court} ${c.docket_number ?? ""}\n  ${c.absolute_url}`)
      .join("\n");
    const unsub = sub.unsubscribe_token
      ? `\nUnsubscribe: ${SITE_URL}/api/unsubscribe?token=${sub.unsubscribe_token}\n`
      : "";
    const text =
      `New Schedule A filings matching your watch "${sub.query}":\n\n${lines}\n\n` +
      `Check the full picture: ${SITE_URL}/check?q=${encodeURIComponent(sub.query)}\n\n` +
      `This is public court-record data via CourtListener/RECAP and is not legal advice.\n${unsub}`;

    await send(sub.email, `⚠ ${fresh.length} new Schedule A filing(s) for "${sub.query}"`, text);
    await run("UPDATE subscriptions SET last_notified_at = datetime('now') WHERE id = ?", [sub.id]);
    notified++;
  }
  return { subscriptions: subs.length, notified };
}
