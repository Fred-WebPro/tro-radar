import { NextResponse, type NextRequest } from "next/server";

// English lives at the root (no /en in the address bar); Russian under /ru.
// Internally every page is served from app/[lang], so unprefixed paths are
// rewritten to /en/... and explicit /en/... URLs redirect to the clean form.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  if (pathname === "/ru" || pathname.startsWith("/ru/")) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = `/en${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip API routes, Next internals, and files with extensions (icons, sitemap…).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
