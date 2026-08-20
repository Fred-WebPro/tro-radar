import { NextResponse } from "next/server";
import { addSubscription } from "@/lib/repo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string; query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  const query = (body.query ?? "").trim();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (query.length < 2 || query.length > 200) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  await addSubscription(email, query);
  return NextResponse.json({ ok: true });
}
