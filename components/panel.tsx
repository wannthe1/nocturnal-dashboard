// The standard dashboard card: a section title, optional subtitle and control, then content.
export function Panel({
  title,
  subtitle,
  action,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode; // shown to the right of the title, e.g. a download button
  className?: string;
  children: React.ReactNode;
}) {
  return (
    // min-w-0 lets wide tables scroll inside the card instead of stretching a grid column.
    <section className={`card min-w-0 p-5 sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[1.05rem] font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-faint">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
