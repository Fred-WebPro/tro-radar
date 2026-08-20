import CaseList from "@/components/CaseList";
import { recentCases } from "@/lib/repo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Recent filings" };

export default async function RecentPage() {
  const cases = await recentCases(100);
  return (
    <div className="space-y-6 py-12">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-medium tracking-tight">Recent filings</h1>
        <p className="text-sm text-ink-2">
          The latest {cases.length} Schedule A cases in our database, newest first.
        </p>
      </header>
      <CaseList cases={cases} />
    </div>
  );
}
