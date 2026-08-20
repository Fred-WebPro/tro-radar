import type { Metadata } from "next";
import { Montserrat, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/lib/site";
import { isLang, p, ui } from "@/lib/i18n";
import LangSwitch from "@/components/LangSwitch";
import "../globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const en = {
    title: {
      default: "TRO Radar — check a brand for Schedule A lawsuits before you list",
      template: "%s — TRO Radar",
    },
    description:
      "Schedule A / TRO lawsuits freeze thousands of seller accounts every month. Check any brand against live federal court records before you list the product.",
  };
  const ru = {
    title: {
      default: "TRO Radar — проверка бренда на иски Schedule A до листинга",
      template: "%s — TRO Radar",
    },
    description:
      "Иски Schedule A / TRO ежемесячно замораживают тысячи аккаунтов продавцов. Проверьте любой бренд по живым записям федеральных судов США до того, как выставить товар.",
  };
  const t = lang === "ru" ? ru : en;
  return {
    metadataBase: new URL(SITE_URL),
    title: t.title,
    description: t.description,
    openGraph: { siteName: "TRO Radar", type: "website" },
    alternates: {
      languages: { en: `${SITE_URL}/`, ru: `${SITE_URL}/ru` },
    },
  };
}

function RadarMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden className="shrink-0">
      <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="4.5" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="10" y1="10" x2="16" y2="4.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="1.6" fill="#d03b3b" />
    </svg>
  );
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = ui[lang];

  return (
    <html
      lang={lang}
      className={`${montserrat.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <div aria-hidden className="h-1 bg-ink" />
        <header className="border-b border-rule bg-surface">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
            <Link href={p(lang, "/")} className="flex items-center gap-2.5 text-ink">
              <span className="relative flex" aria-hidden>
                <RadarMark />
                <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-critical/60" />
              </span>
              <span className="font-display text-xl font-semibold tracking-tight">TRO Radar</span>
            </Link>
            <nav className="flex items-center gap-6 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-2">
              <Link href={p(lang, "/guide")} className="hover:text-ink">{t.nav.guide}</Link>
              <Link href={p(lang, "/recent")} className="hidden hover:text-ink sm:block">{t.nav.recent}</Link>
              <Link href={p(lang, "/plaintiffs")} className="hidden hover:text-ink sm:block">{t.nav.plaintiffs}</Link>
              <LangSwitch lang={lang} />
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-5">{children}</main>

        <footer className="mt-20 border-t border-rule bg-surface">
          <div className="mx-auto max-w-5xl space-y-3 px-5 py-8 text-xs leading-relaxed text-ink-muted">
            <p>
              <strong className="text-ink-2">{t.footer.disclaimerTitle}</strong>{" "}
              {t.footer.disclaimer}
            </p>
            <p className="font-mono">
              {t.footer.data}{" "}
              <a
                href="https://www.courtlistener.com/"
                className="underline decoration-rule-strong underline-offset-2 hover:text-ink-2"
                rel="noopener noreferrer"
                target="_blank"
              >
                CourtListener
              </a>
              {t.footer.dataTail}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
