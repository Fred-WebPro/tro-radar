import { ui, type Lang } from "@/lib/i18n";

export default function StatusBadge({
  lang = "en",
  terminated,
}: {
  lang?: Lang;
  terminated: string | null;
}) {
  const t = ui[lang].badge;
  if (!terminated) {
    return (
      <span className="inline-flex items-center gap-1.5 border border-critical/60 bg-critical/5 px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-critical-ink">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-critical" />
        {t.active}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 border border-rule px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
      {t.closed} {terminated}
    </span>
  );
}
