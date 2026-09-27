export function IrbanDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Memuat data dashboard">
      {/* Metric Cards Skeleton */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-44 rounded-2xl border border-line bg-surface p-5 shadow-card">
            <div className="flex justify-between items-center">
              <div className="h-3 w-28 rounded bg-line" />
              <div className="size-10 rounded-xl bg-line" />
            </div>
            <div className="mt-5 space-y-3">
              <div className="h-8 w-20 rounded bg-line" />
              <div className="h-4 w-36 rounded bg-line" />
            </div>
            <div className="mt-5 border-t border-line/50 pt-3">
              <div className="h-3 w-24 rounded bg-line" />
            </div>
          </div>
        ))}
      </div>

      {/* Grid 2 Columns Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 rounded-2xl border border-line bg-surface p-6 shadow-card">
          <div className="flex justify-between items-center border-b border-line pb-4">
            <div className="space-y-2">
              <div className="h-5 w-44 rounded bg-line" />
              <div className="h-3 w-60 rounded bg-line" />
            </div>
            <div className="size-9 rounded-xl bg-line" />
          </div>
          <div className="mt-6 space-y-4">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-3 w-24 rounded bg-line" />
                  <div className="h-3 w-12 rounded bg-line" />
                </div>
                <div className="h-2 w-full rounded-full bg-line" />
              </div>
            ))}
          </div>
        </div>

        <div className="h-80 rounded-2xl border border-line bg-surface p-6 shadow-card">
          <div className="flex justify-between items-center border-b border-line pb-4">
            <div className="space-y-2">
              <div className="h-5 w-48 rounded bg-line" />
              <div className="h-3 w-64 rounded bg-line" />
            </div>
            <div className="size-9 rounded-xl bg-line" />
          </div>
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map((k) => (
              <div key={k} className="h-16 rounded-xl border border-line/60 bg-canvas/40 p-3" />
            ))}
          </div>
        </div>
      </div>

      {/* Recent LHP Skeleton */}
      <div className="h-64 rounded-2xl border border-line bg-surface p-6 shadow-card">
        <div className="flex justify-between items-center border-b border-line pb-4">
          <div className="space-y-2">
            <div className="h-5 w-40 rounded bg-line" />
            <div className="h-3 w-56 rounded bg-line" />
          </div>
          <div className="size-9 rounded-xl bg-line" />
        </div>
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((m) => (
            <div key={m} className="h-10 w-full rounded bg-line/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
