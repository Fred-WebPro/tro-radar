import { removeSubscriptionByToken } from "@/lib/repo";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const ok = token.length >= 8 ? await removeSubscriptionByToken(token) : false;
  const message = ok
    ? "You have been unsubscribed. No more alerts for this watch."
    : "This unsubscribe link is invalid or was already used.";
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>TRO Radar</title>
     <body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem">
       <h1 style="font-size:1.25rem">TRO Radar</h1><p>${message}</p>
       <p><a href="/">← Back to TRO Radar</a></p>
     </body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" }, status: ok ? 200 : 404 }
  );
}
