"use client";

import { useState } from "react";
import {
  AlertCircle,
  Calendar,
  Crown,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { usePimpinanDashboard } from "@/features/dashboard/hooks/use-pimpinan-dashboard";
import { PimpinanExecutiveCards } from "@/features/dashboard/components/pimpinan-executive-cards";
import { IrbanProgressComparison } from "@/features/dashboard/components/irban-progress-comparison";
import { TopOpdOutstandingTable } from "@/features/dashboard/components/top-opd-outstanding-table";
import { getApiErrorMessage } from "@/lib/api-client";

export default function DashboardPimpinanPage() {
  const currentYear = new Date().getFullYear();
  const [tahun, setTahun] = useState<number>(currentYear);

  const { data, isLoading, error, refetch } = usePimpinanDashboard(tahun);

  return (
    <div className="space-y-6">
      {/* Header Halaman Pimpinan */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="eyebrow">Dashboard Eksekutif</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-2xs font-extrabold text-purple-700 border border-purple-200">
              <Crown size={11} />
              Tingkat Pimpinan & Bupati
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Ikhtisar Pengawasan Daerah
          </h2>
          <p className="mt-1 text-xs text-muted">
            Monitoring makro kinerja penyelesaian tindak lanjut, kepatuhan OPD, dan pemulihan kerugian keuangan daerah seluruh wilayah.
          </p>
        </div>

        {/* Filter Tahun & Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs shadow-xs">
            <Calendar size={13} className="text-muted" />
            <select
              value={tahun}
              onChange={(e) => setTahun(parseInt(e.target.value, 10))}
              className="bg-transparent font-bold text-ink outline-hidden cursor-pointer text-xs"
            >
              <option value="2026">Tahun 2026</option>
              <option value="2025">Tahun 2025</option>
              <option value="2024">Tahun 2024</option>
              <option value="2023">Tahun 2023</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="button-secondary text-xs flex items-center gap-1.5"
            title="Muat ulang data pimpinan"
          >
            <RefreshCw size={13} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-line bg-surface shadow-card">
          <Loader2 className="animate-spin text-brand" size={32} />
          <p className="mt-3 text-xs text-muted">
            Menghimpun metrik eksekutif seluruh wilayah pengawasan...
          </p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-xs text-rose-800">
          <AlertCircle className="mx-auto size-7 text-rose-600 mb-2" />
          <p className="text-sm font-bold">Gagal Mengambil Data Dashboard Pimpinan</p>
          <p className="mt-1 text-2xs">{getApiErrorMessage(error)}</p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Executive Macro KPI Cards */}
          <PimpinanExecutiveCards data={data} />

          {/* Grid: Komparasi Irban & Top 5 OPD Tertunggak */}
          <div className="grid gap-6 lg:grid-cols-2">
            <IrbanProgressComparison items={data.irban_progress} />
            <TopOpdOutstandingTable items={data.top_opd_outstanding} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
