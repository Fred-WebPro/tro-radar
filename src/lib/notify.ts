// Delivery channels for alerts. Email via Resend, Telegram via the Bot API.
// Both degrade to console logging when their key is absent, so the whole
// pipeline can be exercised without any third-party account.

const TELEGRAM_API = "https://api.telegram.org";

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n--- would email ${to} ---\nSubject: ${subject}\n${text}\n---`);
    return true;
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
  if (!res.ok) {
    console.error(`Resend failed: ${res.status} ${await res.text()}`);
    return false;
  }
  return true;
}

export async function sendTelegram(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log(`\n--- would Telegram ${chatId} ---\n${text}\n---`);
    return true;
  }
  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    console.error(`Telegram failed: ${res.status} ${await res.text()}`);
    return false;
  }
  return true;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
}
