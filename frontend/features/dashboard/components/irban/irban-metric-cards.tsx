import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  FileText,
} from "lucide-react";
import type { DashboardIrbanMetrics, SpAlerts } from "@/features/dashboard/types";
import { formatPercent, formatRupiah } from "@/features/dashboard/utils/formatters";

type IrbanMetricCardsProps = {
  metrics: DashboardIrbanMetrics;
  spAlerts: SpAlerts;
};

export function IrbanMetricCards({ metrics, spAlerts }: IrbanMetricCardsProps) {
  const recoveryRate =
    metrics.total_nilai_rekomendasi > 0
      ? (metrics.total_nilai_setor / metrics.total_nilai_rekomendasi) * 100
      : 0;

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {/* Kartu 1: LHP */}
      <article className="rounded-2xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-panel">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider uppercase text-muted">
            Laporan Hasil Pemeriksaan
          </span>
          <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
            <FileText aria-hidden size={20} />
          </span>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold tracking-tight text-ink">
            {metrics.total_lhp}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1 font-medium text-amber-700">
              <span className="size-2 rounded-full bg-amber-500" />
              {metrics.lhp_open} Berjalan
            </span>
            <span className="text-line-strong">•</span>
            <span className="flex items-center gap-1 font-medium text-emerald-700">
              <span className="size-2 rounded-full bg-emerald-500" />
              {metrics.lhp_closed} Ditandai Selesai
            </span>
          </div>
        </div>
        <div className="mt-4 border-t border-line/60 pt-3 text-xs text-muted">
          Total Temuan: <span className="font-semibold text-ink">{metrics.total_temuan}</span>
        </div>
      </article>

      {/* Kartu 2: Rekomendasi & Progres */}
      <article className="rounded-2xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-panel">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider uppercase text-muted">
            Tindak Lanjut Rekomendasi
          </span>
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 aria-hidden size={20} />
          </span>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-bold tracking-tight text-ink">
              {metrics.rekomendasi_selesai}{" "}
              <span className="text-base font-normal text-muted">
                / {metrics.total_rekomendasi}
              </span>
            </p>
            <span className="text-sm font-semibold text-emerald-700">
              {formatPercent(metrics.persentase_selesai)}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-line/60">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, metrics.persentase_selesai))}%` }}
            />
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1 font-medium text-emerald-700">
              <span className="size-2 rounded-full bg-emerald-500" />
              {metrics.rekomendasi_selesai} Selesai
            </span>
            <span className="text-line-strong">•</span>
            <span className="flex items-center gap-1 font-medium text-amber-700">
              <span className="size-2 rounded-full bg-amber-500" />
              {metrics.rekomendasi_belum_selesai} Menunggu
            </span>
          </div>
        </div>
        <div className="mt-4 border-t border-line/60 pt-3 text-xs text-muted">
          Tingkat Penyelesaian:{" "}
          <span className="font-semibold text-ink">
            {formatPercent(metrics.persentase_selesai)}
          </span>
        </div>
      </article>

      {/* Kartu 3: Surat Peringatan (SP Due) */}
      <article className="rounded-2xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-panel">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider uppercase text-muted">
            Peringatan Jatuh Tempo
          </span>
          <span
            className={`grid size-10 place-items-center rounded-xl ${
              spAlerts.total_due > 0
                ? "bg-rose-50 text-rose-600"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            <AlertTriangle aria-hidden size={20} />
          </span>
        </div>
        <div className="mt-4">
          <p
            className={`text-3xl font-bold tracking-tight ${
              spAlerts.total_due > 0 ? "text-rose-600" : "text-ink"
            }`}
          >
            {spAlerts.total_due}{" "}
            <span className="text-sm font-normal text-muted">LHP Due</span>
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span
              className={`rounded-md px-2 py-0.5 font-semibold ${
                spAlerts.sp1_due > 0
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              SP1: {spAlerts.sp1_due}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 font-semibold ${
                spAlerts.sp2_due > 0
                  ? "bg-orange-100 text-orange-800"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              SP2: {sp2DueCount(spAlerts)}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 font-semibold ${
                spAlerts.sp3_due > 0
                  ? "bg-rose-100 text-rose-800"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              SP3: {spAlerts.sp3_due}
            </span>
          </div>
        </div>
        <div className="mt-4 border-t border-line/60 pt-3 text-xs text-muted">
          Batas waktu: <span className="font-medium text-ink">30 / 45 / 60 hari kalender</span>
        </div>
      </article>

      {/* Kartu 4: Kerugian & Setoran Finansial (Opsional) */}
      <article className="rounded-2xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-panel">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider uppercase text-muted">
            Pemulihan Kerugian Daerah
          </span>
          <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-brand">
            <Coins aria-hidden size={20} />
          </span>
        </div>
        <div className="mt-4">
          <p className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {formatRupiah(metrics.total_nilai_setor)}
          </p>
          <p className="mt-1 text-xs text-muted">
            dari total kewajiban {formatRupiah(metrics.total_nilai_rekomendasi)}
          </p>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-line/60">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, recoveryRate))}%` }}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-xs">
          <span className="text-muted">Sisa Pengembalian:</span>
          <span className="font-semibold text-rose-700">
            {formatRupiah(metrics.sisa_nilai_rekomendasi)}
          </span>
        </div>
      </article>
    </div>
  );
}

function sp2DueCount(spAlerts: SpAlerts) {
  return spAlerts.sp2_due;
}
