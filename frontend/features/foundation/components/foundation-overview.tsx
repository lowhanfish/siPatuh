const foundations = [
  {
    label: "Server state",
    value: "TanStack Query",
    detail: "Caching dan lifecycle request API terpusat.",
  },
  {
    label: "UI state",
    value: "Zustand",
    detail: "Khusus state antarmuka, tanpa menyimpan JWT.",
  },
  {
    label: "Session",
    value: "httpOnly cookie",
    detail: "Guard sesi dan navigasi role aktif tanpa menyimpan JWT.",
  },
];

export function FoundationOverview() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {foundations.map((item, index) => (
        <article
          className="rounded-2xl border border-line bg-surface p-5 shadow-card"
          key={item.label}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              {item.label}
            </p>
            <span className="grid size-7 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
              {index + 1}
            </span>
          </div>
          <h2 className="mt-5 text-lg font-semibold text-ink">{item.value}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p>
        </article>
      ))}
    </div>
  );
}
