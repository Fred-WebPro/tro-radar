// Telegram bot webhook. The only command that matters is /start <link-code>,
// which binds a chat to an account so alerts can reach it.
//
// Setup once the bot exists:
//   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<site>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>"

import { NextResponse } from "next/server";
import { getAccountByTelegramCode, updateAccount } from "@/lib/accounts";
import { sendTelegram } from "@/lib/notify";

export const dynamic = "force-dynamic";

const REPLY = {
  en: {
    linked: "✅ Linked. You'll get an alert here the moment a new lawsuit hits a product in your portfolio.",
    unknown: "I didn't recognise that link code. Open TRO Radar → Settings and use the Telegram button there.",
    help: "Open TRO Radar → Settings and tap “Connect Telegram” to link this chat.",
  },
  ru: {
    linked: "✅ Подключено. Пришлём сюда алерт, как только по товару из вашего портфеля подадут иск.",
    unknown: "Не узнаю этот код. Откройте TRO Radar → Настройки и нажмите кнопку Telegram там.",
    help: "Откройте TRO Radar → Настройки и нажмите «Подключить Telegram», чтобы привязать этот чат.",
  },
} as const;

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: { message?: { chat?: { id?: number }; text?: string; from?: { language_code?: string } } };
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const chatId = update.message?.chat?.id;
  const text = (update.message?.text ?? "").trim();
  if (!chatId) return NextResponse.json({ ok: true });

  const lang = update.message?.from?.language_code?.startsWith("ru") ? "ru" : "en";
  const match = /^\/start\s+(\S+)/.exec(text);

  if (!match) {
    await sendTelegram(String(chatId), REPLY[lang].help);
    return NextResponse.json({ ok: true });
  }

  const account = await getAccountByTelegramCode(match[1]);
  if (!account) {
    await sendTelegram(String(chatId), REPLY[lang].unknown);
    return NextResponse.json({ ok: true });
  }

  await updateAccount(account.id, { telegram_chat_id: String(chatId) });
  await sendTelegram(String(chatId), REPLY[account.lang]?.linked ?? REPLY[lang].linked);
  return NextResponse.json({ ok: true });
}
