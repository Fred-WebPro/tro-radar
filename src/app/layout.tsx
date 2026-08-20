import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TRO Radar — check a brand for Schedule A lawsuits before you list",
    template: "%s — TRO Radar",
  },
  description:
    "Schedule A / TRO lawsuits freeze thousands of seller accounts every month. Check any brand against live federal court records before you list the product.",
  openGraph: {
    siteName: "TRO Radar",
    type: "website",
  },
};

function RadarMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden className="shrink-0">
      <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="4.5" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="10" y1="10" x2="16" y2="4.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="1.6" fill="currentColor" />
    </svg>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <div aria-hidden className="h-1 bg-ink" />
        <header className="border-b border-rule bg-surface">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
            <Link href="/" className="flex items-center gap-2.5 text-ink">
              <RadarMark />
              <span className="font-display text-xl font-semibold tracking-tight">TRO Radar</span>
            </Link>
            <nav className="flex items-center gap-6 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-2">
              <Link href="/recent" className="hover:text-ink">Recent filings</Link>
              <Link href="/plaintiffs" className="hover:text-ink">Serial plaintiffs</Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-5">{children}</main>

        <footer className="mt-20 border-t border-rule bg-surface">
          <div className="mx-auto max-w-5xl space-y-3 px-5 py-8 text-xs leading-relaxed text-ink-muted">
            <p>
              <strong className="text-ink-2">Not legal advice.</strong> TRO Radar surfaces public
              court records for research purposes. A green result is not a guarantee of safety, and
              a red result is not a legal determination. Consult an attorney before acting on
              anything you see here.
            </p>
            <p className="font-mono">
              Data: federal court records via{" "}
              <a
                href="https://www.courtlistener.com/"
                className="underline decoration-rule-strong underline-offset-2 hover:text-ink-2"
                rel="noopener noreferrer"
                target="_blank"
              >
                CourtListener
              </a>
              /RECAP (Free Law Project) · © 2026 TRO Radar
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
