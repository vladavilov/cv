type SectionShellProps = {
  id: string;
  label: string;
  title: string;
  summary: string;
  status: string;
  highlights?: string[];
};

export function SectionShell({
  id,
  label,
  title,
  summary,
  status,
  highlights = [],
}: SectionShellProps) {
  const headingId = `${id}-heading`;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className="section-shell border-b border-white/6"
    >
      <div className="page-shell">
        <div className="glass-panel rounded-[var(--radius)] px-5 py-6 md:px-6 md:py-7">
          <p className="section-kicker">{label}</p>
          <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <h2 id={headingId} className="section-heading">
                {title}
              </h2>
              <p className="section-copy">{summary}</p>
              {highlights.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {highlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <p className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {status}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
