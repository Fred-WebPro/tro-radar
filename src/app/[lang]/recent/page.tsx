import { notFound } from "next/navigation";
import CaseList from "@/components/CaseList";
import { recentCases } from "@/lib/repo";
import { isLang, type Lang } from "@/lib/i18n";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const T = {
  en: {
    title: "Recent filings",
    sub: (n: number) => `The latest ${n} Schedule A cases in our database, newest first.`,
  },
  ru: {
    title: "Свежие иски",
    sub: (n: number) => `Последние ${n} дел Schedule A в нашей базе, сначала новые.`,
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return { title: T[lang === "ru" ? "ru" : "en"].title };
}

export default async function RecentPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: langParam } = await params;
  if (!isLang(langParam)) notFound();
  const lang: Lang = langParam;
  const t = T[lang];
  const cases = await recentCases(100);
  return (
    <div className="space-y-6 py-12">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-medium tracking-tight">{t.title}</h1>
        <p className="text-sm text-ink-2">{t.sub(cases.length)}</p>
      </header>
      <CaseList lang={lang} cases={cases} />
    </div>
  );
}
