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

1. **Push the repo to GitHub** (public repo = unlimited free Actions minutes).
2. **Turso** (free tier): create a database, then
   `turso db show --url` and `turso db tokens create` give you
   `TURSO_DATABASE_URL` (libsql://…) and `TURSO_AUTH_TOKEN`.
3. **Seed it once from your machine** — put both values in `.env.local`, then
   `npm run ingest -- --since 2025-08-20` (or deeper).
4. **Vercel** (free Hobby): import the repo, add env vars
   `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SITE_URL=https://<app>.vercel.app`.
5. **GitHub Actions** (already in `.github/workflows/`):
   - `sync-data.yml` re-ingests every 6 hours;
   - `send-digest.yml` emails watchlist digests daily.
   Add repository **secrets**: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and optionally
   `CL_API_TOKEN`, `RESEND_API_KEY`, `DIGEST_FROM`; and a repository **variable** `SITE_URL`.
6. **Resend** (free: 100 emails/day): API key enables real digest emails. Note: without
   a verified custom domain (~$10/yr, the only non-free item, optional), Resend only
   delivers to your own address — fine for testing.
7. **CourtListener token** (free registration) removes anonymous rate limits for the
   6-hourly sync.

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
| `/sitemap.xml`, `/robots.txt` | SEO: brand check pages are indexable landing pages |

Scripts: `npm run ingest` (pull/refresh cases), `npm run digest` (email new filings to
watchers).

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
