"use client";

import { useState } from "react";
import { AlertCircle, Calendar, RefreshCw } from "lucide-react";
import { useIrbanDashboard } from "@/features/dashboard/hooks/use-irban-dashboard";
import { IrbanMetricCards } from "./irban-metric-cards";
import { StatusBreakdownCard } from "./status-breakdown-card";
import { SpAlertsCard } from "./sp-alerts-card";
import { RecentLhpCard } from "./recent-lhp-card";
import { IrbanDashboardSkeleton } from "./irban-dashboard-skeleton";
import { getApiErrorMessage } from "@/lib/api-client";

export function IrbanDashboardView() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useIrbanDashboard(selectedYear);

  // Daftar opsi tahun: 3 tahun terakhir hingga tahun berjalan
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

  return (
    <div className="space-y-6">
      {/* Header Halaman & Kontrol Filter */}
      <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="eyebrow">Dashboard Operasional</span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {data?.irban?.nama ? data.irban.nama : "Pemantauan Wilayah Irban"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Ikhtisar tindak lanjut hasil pemeriksaan, pemulihan finansial, dan peringatan batas waktu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Tahun */}
          <div className="flex items-center gap-2 rounded-xl border border-line bg-canvas/60 px-3 py-1.5 shadow-xs">
            <Calendar aria-hidden className="text-muted" size={16} />
            <label htmlFor="filter-tahun" className="text-xs font-semibold text-muted">
              Tahun:
            </label>
            <select
              id="filter-tahun"
              aria-label="Pilih tahun pengawasan"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-ink outline-none cursor-pointer"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Tombol Muat Ulang */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-xs transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
            title="Muat ulang data dasbor"
          >
            <RefreshCw
              aria-hidden
              size={14}
              className={isFetching ? "animate-spin text-brand" : "text-muted"}
            />
            <span>{isFetching ? "Memperbarui..." : "Segarkan"}</span>
          </button>
        </div>
      </section>

      {/* Tampilan Error */}
      {isError && (
        <section
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900 shadow-card sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-rose-100 text-rose-700">
              <AlertCircle size={20} />
            </span>
            <div>
              <p className="font-semibold text-sm">Gagal memuat data dasbor</p>
              <p className="text-xs text-rose-800">
                {getApiErrorMessage(error)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-rose-700"
          >
            Coba Lagi
          </button>
        </section>
      )}

      {/* Loading Skeleton vs Main Content */}
      {isLoading ? (
        <IrbanDashboardSkeleton />
      ) : data ? (
        <div className="space-y-6">
          {/* 4 Kartu Metrik Utama */}
          <IrbanMetricCards metrics={data.metrics} spAlerts={data.sp_alerts} />

          {/* Grid 2 Kolom: Status Dinamis & Peringatan SP Due */}
          <div className="grid gap-6 lg:grid-cols-2">
            <StatusBreakdownCard
              statusBreakdown={data.status_breakdown}
              totalRekomendasi={data.metrics.total_rekomendasi}
            />
            <SpAlertsCard spAlerts={data.sp_alerts} />
          </div>

          {/* LHP Terkini */}
          <RecentLhpCard recentLhps={data.recent_lhps} />
        </div>
      ) : null}
    </div>
  );
}
