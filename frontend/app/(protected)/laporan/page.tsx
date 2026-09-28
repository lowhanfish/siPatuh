"use client";

import { useState } from "react";
import { AlertCircle, FileBarChart, Loader2, RefreshCw } from "lucide-react";
import { useSession } from "@/features/auth/hooks/use-auth";
import { useSummaryReport } from "@/features/reports/hooks/use-reports";
import type { ReportFilterParams } from "@/features/reports/types";
import { ReportFilterPanel } from "@/features/reports/components/report-filter-panel";
import { ReportSummaryCards } from "@/features/reports/components/report-summary-cards";
import { ReportStatusBreakdown } from "@/features/reports/components/report-status-breakdown";
import { ReportOpdMatrix } from "@/features/reports/components/report-opd-matrix";
import {
  useJenisPemeriksaanList,
  useStatusRekomendasiList,
} from "@/features/master-data/hooks/use-master-data";
import { useIrbans } from "@/features/users/hooks/use-irbans";
import { useSimpegUnitKerja } from "@/features/unit-kerja/hooks/use-unit-kerja";
import { getApiErrorMessage } from "@/lib/api-client";

export default function LaporanPage() {
  const { data: user } = useSession();

  const isSuperAdminOrBupati =
    user?.role === "SUPER_ADMIN" || user?.role === "BUPATI";

  const currentYear = new Date().getFullYear().toString();

  const [appliedFilters, setAppliedFilters] = useState<ReportFilterParams>({
    tahun: currentYear,
    irban_id: "",
    simpeg_unit_kerja_id: "",
    jenis_pemeriksaan_id: "",
    status_rekomendasi_id: "",
  });

  // Queries
  const {
    data: reportData,
    isLoading: isReportLoading,
    error: reportError,
    refetch,
  } = useSummaryReport(appliedFilters);

  const { data: irbanList = [] } = useIrbans();
  const { data: jenisList = [] } = useJenisPemeriksaanList();
  const { data: statusList = [] } = useStatusRekomendasiList();
  const { data: unitList = [] } = useSimpegUnitKerja();

  function handleApplyFilters(newFilters: ReportFilterParams) {
    setAppliedFilters(newFilters);
  }

  function handleResetFilters() {
    setAppliedFilters({
      tahun: currentYear,
      irban_id: "",
      simpeg_unit_kerja_id: "",
      jenis_pemeriksaan_id: "",
      status_rekomendasi_id: "",
    });
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="eyebrow">Pelaporan & Akuntabilitas Publik</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-2xs font-extrabold text-blue-700">
              <FileBarChart size={11} />
              Rekapitulasi Komprehensif
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Laporan Tindak Lanjut Pengawasan
          </h2>
          <p className="mt-1 text-xs text-muted">
            Rekapitulasi penyelesaian rekomendasi hasil pemeriksaan, pemulihan kerugian daerah, serta ekspor format Excel dan PDF landscape.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="button-secondary text-xs flex items-center gap-1.5 self-start sm:self-center"
          title="Muat ulang data laporan"
        >
          <RefreshCw size={13} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Filter Panel */}
      <ReportFilterPanel
        filters={appliedFilters}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
        irbanList={irbanList}
        jenisList={jenisList}
        statusList={statusList}
        unitList={unitList}
        isSuperAdminOrBupati={isSuperAdminOrBupati}
      />

      {/* Konten Laporan */}
      {isReportLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-line bg-surface">
          <Loader2 className="animate-spin text-brand" size={32} />
          <p className="mt-3 text-xs text-muted">
            Mengkalkulasi metrik laporan dan data pemulihan kas...
          </p>
        </div>
      ) : reportError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-xs text-rose-800">
          <AlertCircle className="mx-auto size-7 text-rose-600 mb-2" />
          <p className="text-sm font-bold">Gagal Mengambil Laporan Pengawasan</p>
          <p className="mt-1 text-2xs">{getApiErrorMessage(reportError)}</p>
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Executive Summary Metrics */}
          <ReportSummaryCards metrics={reportData.metrics} />

          {/* Visual Breakdown Status Rekomendasi */}
          <ReportStatusBreakdown
            items={reportData.status_breakdown}
            totalRekomendasi={reportData.metrics.total_rekomendasi}
          />

          {/* Tabel Matriks Per-OPD */}
          <ReportOpdMatrix items={reportData.opd_breakdown} />
        </div>
      ) : null}
    </div>
  );
}
