# TRO Radar

**Know before you list.** A Schedule A / TRO lawsuit checker for ecommerce sellers and
dropshippers. Tracks federal "Schedule A" trademark cases (one brand suing hundreds of
anonymous online sellers at once) from public court records and answers one question:
*is this brand actively suing sellers right now?*

Data source: [CourtListener](https://www.courtlistener.com/) / RECAP (Free Law Project).

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS 4
- libSQL (`@libsql/client`): a local SQLite file in dev, [Turso](https://turso.tech) in production
- FTS5 full-text search; ingestion/digest scripts run with `tsx`

## Quickstart (local)

```bash
npm install
npm run ingest          # first run pulls the last 365 days (~3,300 cases, ~10 min)
npm run dev             # http://localhost:3000
```

`npm run ingest` is incremental after the first run: it resumes from the newest filing
date it has seen (minus a 3-day overlap). Options: `-- --since 2023-01-01` for a deeper
backfill, `-- --max-pages 20` for a bounded run.

## Free production deploy (the whole stack costs $0)

1. **GitHub**: push the repo.
2. **Vercel** (free Hobby): import the repo. In **Storage → Connect Database**, create a
   **Turso** database (Marketplace, Starter $0) and connect it to the project — the
   `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` env vars are injected automatically.
3. **Seed the database**: hit `https://<app>.vercel.app/api/cron/ingest?pages=15`
   repeatedly until the response says `"done": true` (each call advances a stored
   cursor; a 365-day backfill is ~12 calls). `vercel.json` then keeps it fresh with
   a daily **Vercel Cron** — no extra accounts needed.
4. **Resend** (free: 100 emails/day): add `RESEND_API_KEY` (+ optional `DIGEST_FROM`)
   to enable real digest emails. Without a verified custom domain (~$10/yr, the only
   non-free item, optional), Resend only delivers to your own address — fine for testing.
5. **CourtListener token** (free registration): add `CL_API_TOKEN` to remove anonymous
   API rate limits. Optional: `CRON_SECRET` locks the two `/api/cron/*` endpoints.

The GitHub Actions in `.github/workflows/` are an optional alternative scheduler
(6-hourly instead of daily); enable their `schedule` blocks and add repo secrets if
you want them. `SITE_URL` is derived automatically on Vercel.

## What's inside

| Route | Purpose |
|---|---|
| `/` | Landing: search, live stats, 12-month filing trend, latest filings, top plaintiffs |
| `/check?q=brand` | Risk verdict (red / yellow / green) + matching cases + watch form |
| `/case/[docketId]` | Case detail with parties and a link to the full CourtListener docket |
| `/recent` | Latest 100 filings |
| `/plaintiffs` | Serial-filer leaderboard (top 100) |
| `/api/check?q=` | JSON verdict — the endpoint a future Chrome extension calls |
| `/api/subscribe` | POST `{email, query}` — watchlist signup |
| `/api/unsubscribe?token=` | One-click unsubscribe (linked from digest emails) |
| `/api/cron/ingest` | Chunked, cursor-resumable data sync (Vercel Cron daily + manual seeding) |
| `/api/cron/digest` | Watchlist digest sender (Vercel Cron daily) |
| `/sitemap.xml`, `/robots.txt` | SEO: brand check pages are indexable landing pages |

Scripts: `npm run ingest` (pull/refresh cases), `npm run digest` (email new filings to
watchers).

## Chrome extension

`extension/` is a Manifest V3 extension that shows the traffic-light verdict directly on
**AliExpress, Temu, 1688, and Alibaba** product pages (badge in the bottom-right corner,
powered by `/api/check`), plus a popup for manual checks.

Install (unpacked): `chrome://extensions` → enable **Developer mode** → **Load unpacked**
→ select the `extension/` folder. Publishing to the Chrome Web Store requires a one-time
$5 developer registration.

## How the verdict works

Search text is tokenized and matched (FTS5) against case names, plaintiffs, and
normalized brand names. **Red** — at least one matching case is open (no termination
date). **Yellow** — matches exist but all are closed. **Green** — no matches, with an
explicit "absence is not safety" disclaimer.

## Design

Light "legal paper" theme: Fraunces for display type, Geist for text, Geist Mono for
docket data; hairline rules instead of cards; stamp-style verdict panels. Chart colors
follow a CVD-validated palette.

## Roadmap

- Chrome extension (MV3) calling `/api/check` from AliExpress/Temu/1688 product pages
- Deeper backfill (2018+) and more case-name patterns ("Exhibit A", "Does 1-100")
- Design-patent and image-based matching (complaint exhibits → product photo similarity)
- Double opt-in for the watchlist
- Paid tier: unlimited checks, instant (not daily) alerts, CSV export

## Legal

Not legal advice. This tool surfaces public court records; verdicts are heuristics, not
legal determinations. Consult an attorney before acting on anything shown here.
