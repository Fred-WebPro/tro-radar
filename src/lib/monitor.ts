// Portfolio monitoring: re-check every pinned product against new filings and
// alert its owner. This is the job that makes the subscription worth paying for.

import { query } from "./db";
import { allPortfolioItems, recheckItem, type PortfolioHit } from "./portfolio";
import { limitsFor, type Account, type Plan } from "./accounts";
import { sendEmail, sendTelegram, escapeHtml } from "./notify";
import { SITE_URL } from "./site";
import type { Lang } from "./i18n";

const TEXT = {
  en: {
    subject: (n: number) => `⚠ ${n} product${n === 1 ? "" : "s"} in your portfolio just got hit`,
    intro: "New Schedule A lawsuits match products you're watching:",
    product: "Product",
    newCases: "New cases",
    action:
      "Consider delisting these products and withdrawing your balance before freeze orders reach the platforms.",
    manage: "Manage your portfolio:",
    tgTitle: (n: number) => `⚠ <b>TRO Radar</b>: ${n} product${n === 1 ? "" : "s"} hit`,
  },
  ru: {
    subject: (n: number) => `⚠ По вашим товарам поданы иски: ${n}`,
    intro: "Новые иски Schedule A совпали с товарами из вашего портфеля:",
    product: "Товар",
    newCases: "Новые дела",
    action:
      "Подумайте о снятии этих товаров с продажи и выводе баланса, пока ордера на заморозку не дошли до площадок.",
    manage: "Управление портфелем:",
    tgTitle: (n: number) => `⚠ <b>TRO Radar</b>: затронуто товаров — ${n}`,
  },
} as const;

function emailBody(hits: PortfolioHit[], lang: Lang): string {
  const t = TEXT[lang];
  const blocks = hits
    .map((h) => {
      const cases = h.freshCases
        .slice(0, 5)
        .map((c) => `    • ${c.date_filed} ${c.brand} — ${c.court} ${c.docket_number ?? ""}\n      ${c.absolute_url}`)
        .join("\n");
      return `${t.product}: ${h.item.title}\n${t.newCases}: ${h.freshCases.length}\n${cases}`;
    })
    .join("\n\n");
  return `${t.intro}\n\n${blocks}\n\n${t.action}\n\n${t.manage} ${SITE_URL}${lang === "ru" ? "/ru" : ""}/portfolio\n`;
}

function telegramBody(hits: PortfolioHit[], lang: Lang): string {
  const t = TEXT[lang];
  const blocks = hits
    .slice(0, 8)
    .map((h) => {
      const first = h.freshCases[0];
      return `• <b>${escapeHtml(h.item.title.slice(0, 70))}</b>\n  ${h.freshCases.length} × ${escapeHtml(first?.brand ?? "")} — ${first?.date_filed ?? ""}`;
    })
    .join("\n");
  return `${t.tgTitle(hits.length)}\n\n${blocks}\n\n${escapeHtml(t.action)}`;
}

export interface MonitorResult {
  itemsChecked: number;
  accountsAlerted: number;
  hits: number;
}

/**
 * Re-check all portfolio items, group new hits per account, notify.
 * Free accounts only get alerts in the weekly digest run (`instantOnly=false`).
 */
export async function runMonitor(opts: { instantOnly?: boolean } = {}): Promise<MonitorResult> {
  const items = await allPortfolioItems();
  const accounts = await query<Record<string, unknown>>("SELECT * FROM accounts");
  const byId = new Map<number, Account>();
  for (const a of accounts) {
    byId.set(Number(a.id), {
      id: Number(a.id),
      token: String(a.token),
      email: (a.email as string) ?? null,
      plan: ((a.plan as Plan) ?? "free") as Plan,
      telegram_chat_id: (a.telegram_chat_id as string) ?? null,
      telegram_link_code: (a.telegram_link_code as string) ?? null,
      lang: ((a.lang as Lang) ?? "en") as Lang,
    });
  }

  const hitsByAccount = new Map<number, PortfolioHit[]>();
  let checked = 0;

  for (const item of items) {
    const acc = byId.get(item.account_id);
    if (!acc) continue;
    // Instant runs are a Pro benefit; free accounts are swept by the daily job.
    if (opts.instantOnly && !limitsFor(acc.plan).instantAlerts) continue;

    const hit = await recheckItem(item, acc.lang);
    checked++;
    if (hit.freshCases.length > 0) {
      const list = hitsByAccount.get(item.account_id) ?? [];
      list.push(hit);
      hitsByAccount.set(item.account_id, list);
    }
  }

  let alerted = 0;
  let totalHits = 0;
  for (const [accountId, hits] of hitsByAccount) {
    const acc = byId.get(accountId);
    if (!acc) continue;
    totalHits += hits.length;
    const t = TEXT[acc.lang];
    let delivered = false;
    if (acc.email) {
      delivered = (await sendEmail(acc.email, t.subject(hits.length), emailBody(hits, acc.lang))) || delivered;
    }
    if (acc.telegram_chat_id) {
      delivered = (await sendTelegram(acc.telegram_chat_id, telegramBody(hits, acc.lang))) || delivered;
    }
    if (delivered) alerted++;
  }

  return { itemsChecked: checked, accountsAlerted: alerted, hits: totalHits };
}
