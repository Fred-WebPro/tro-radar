# Launch post drafts

Черновики для ручной публикации (Reddit не любит рекламу — тон честный,
«сделал инструмент, потому что сам столкнулся с проблемой»). Публикуешь сам,
лучше с аккаунта с историей. Не постить одновременно в оба сабреддита — с
интервалом в несколько дней.

---

## r/dropship / r/Aliexpress (главный пост)

**Title:** I built a free tool that checks if a brand is currently suing
sellers (Schedule A / TRO lawsuits) before you list the product

**Body:**

Last year a friend woke up to a frozen PayPal balance because of a "Schedule A"
lawsuit — one of those cases where a brand sues 200+ sellers at once and the
defendant list is sealed, so you only find out when your money is already
frozen. There are ~10,000 of these cases filed since 2018, and about 3,300 in
the last 12 months alone. Sony alone filed 5 cases in one week this August.

The crazy part: the filings themselves are public court records, available the
day they're filed. Nobody reads them, because they're buried in PACER.

So I built **TRO Radar** (tro-radar.vercel.app) — it pulls every Schedule A
case from federal court records daily and gives you a red / yellow / green
verdict for any brand or product name:

- **Red** — this brand has open cases right now, sellers are being sued as we
  speak. Don't list it.
- **Yellow** — the brand has sued sellers before; the cases are closed but they
  clearly enforce.
- **Green** — no matching cases (not a guarantee, but a real signal).

You can also see which brands sue the most (Bosch, NBCUniversal, Netflix,
Mattel, Toyota are the top serial filers — some of the results genuinely
surprised me), watch a brand and get an email the day a new case is filed, and
there's a Chrome extension that shows the verdict right on AliExpress/Temu
product pages.

It's free, data comes from CourtListener/RECAP (the non-profit that mirrors
PACER). Not legal advice, obviously — it's a research tool.

Would love feedback: what would make this actually useful for your sourcing
workflow?

---

## r/ecommerce / r/AmazonSeller (вариант короче)

**Title:** PSA: you can check if a brand is suing online sellers (Schedule A /
TRO cases) before you list — I made a free checker

**Body:**

Schedule A lawsuits (brand sues hundreds of sellers at once, list sealed,
accounts frozen before you know it) have hit ~3,300 filings in the last 12
months. The filings are public from day one — they're just buried in court
records.

I built a free checker that matches any brand/product name against every
Schedule A case since 2018: tro-radar.vercel.app. Red = active enforcement,
yellow = enforcement history, green = nothing found. Plus a leaderboard of the
most litigious brands and email alerts for brands you watch.

Data from CourtListener/RECAP. Not legal advice. Feedback welcome.

---

## Что мерить после поста

- Регистрации в watchlist (таблица subscriptions) — главный сигнал спроса.
- Поисковые запросы в логах Vercel (`/check?q=…`) — какие бренды проверяют.
- Если 20-30 подписок за неделю → строить платный тариф (мгновенные алерты,
  безлимит, CSV) поверх Stripe/Lemon Squeezy.
