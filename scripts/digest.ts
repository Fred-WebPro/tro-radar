// Send watchlist digests: for every subscription, find matching cases filed
// since the last notification and email them.
//
//   npm run digest
//
// With RESEND_API_KEY set, emails go out via Resend (set DIGEST_FROM too,
// e.g. "TRO Radar <alerts@yourdomain.com>"). Without it, emails are printed
// to the console so the pipeline can be tested end-to-end.

import { query, run } from "../src/lib/db";
import { searchCases } from "../src/lib/repo";

interface Sub {
  id: number;
  email: string;
  query: string;
  unsubscribe_token: string | null;
  last_notified_at: string | null;
  created_at: string;
}

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

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

async function main() {
  const subs = await query<Sub>("SELECT * FROM subscriptions");
  console.log(`${subs.length} subscription(s).`);

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
    console.log(`Notified ${sub.email} about ${fresh.length} case(s) for "${sub.query}".`);
  }
  console.log("Digest done.");
}

main().catch((err) => {
  console.error("Digest failed:", err.message);
  process.exit(1);
});
