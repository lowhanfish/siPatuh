import { PieChart } from "lucide-react";
import { formatPercent } from "@/features/dashboard/utils/formatters";

type StatusBreakdownCardProps = {
  statusBreakdown: Record<string, number>;
  totalRekomendasi: number;
};

function getStatusColorClasses(statusName: string): {
  bg: string;
  badge: string;
  bar: string;
} {
  const normalized = statusName.toLowerCase();

  if (normalized.includes("belum ditindak") || normalized.includes("belum tindak")) {
    return {
      bg: "bg-rose-50",
      badge: "bg-rose-100 text-rose-800 border-rose-200",
      bar: "bg-rose-500",
    };
  }

  if (normalized.includes("belum sesuai")) {
    return {
      bg: "bg-amber-50",
      badge: "bg-amber-100 text-amber-800 border-amber-200",
      bar: "bg-amber-500",
    };
  }

  if (normalized.includes("sesuai")) {
    return {
      bg: "bg-emerald-50",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
      bar: "bg-emerald-500",
    };
  }

  if (normalized.includes("tidak dapat") || normalized.includes("batal")) {
    return {
      bg: "bg-slate-100",
      badge: "bg-slate-200 text-slate-800 border-slate-300",
      bar: "bg-slate-500",
    };
  }

  // Fallback netral untuk status dinamis kustom lainnya
  return {
    bg: "bg-blue-50",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    bar: "bg-brand",
  };
}

export function StatusBreakdownCard({
  statusBreakdown,
  totalRekomendasi,
}: StatusBreakdownCardProps) {
  const entries = Object.entries(statusBreakdown);
  const totalCount =
    totalRekomendasi > 0
      ? totalRekomendasi
      : entries.reduce((acc, [, val]) => acc + val, 0);

  return (
    <article className="rounded-2xl border border-line bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-ink sm:text-lg">
            Distribusi Status Rekomendasi
          </h3>
          <p className="mt-1 text-xs text-muted">
            Status pengawasan aktif dievaluasi langsung dari database master
          </p>
        </div>
        <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand">
          <PieChart aria-hidden size={18} />
        </span>
      </div>

      <div className="mt-5">
        {entries.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted">Belum ada data rekomendasi pada tahun ini.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map(([statusName, count]) => {
              const percent = totalCount > 0 ? (count / totalCount) * 100 : 0;
              const colors = getStatusColorClasses(statusName);

              return (
                <div key={statusName} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="flex items-center gap-2 font-medium text-ink">
                      <span className={`size-2.5 rounded-full ${colors.bar}`} />
                      <span>{statusName}</span>
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-ink">{count}</span>
                      <span className="w-12 text-right font-medium text-muted">
                        {formatPercent(percent)}
                      </span>
                    </div>
                  </div>

                  {/* Visual Proportion Bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-line/50">
                    <div
                      className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
                      style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {entries.length > 0 && (
        <div className="mt-6 flex items-center justify-between border-t border-line/60 pt-4 text-xs font-semibold text-muted">
          <span>Total Akumulasi Rekomendasi:</span>
          <span className="text-sm font-bold text-ink">{totalCount} butir</span>
        </div>
      )}
    </article>
  );
}
