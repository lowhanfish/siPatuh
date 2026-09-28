"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, Filter, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { ReportFilterParams } from "../types";
import type { JenisPemeriksaan, StatusRekomendasi } from "@/features/master-data/types";
import { exportReportExcel, exportReportPdf } from "../api/reports-api";
import { getApiErrorMessage } from "@/lib/api-client";

type ReportFilterPanelProps = {
  filters: ReportFilterParams;
  onApplyFilters: (filters: ReportFilterParams) => void;
  onResetFilters: () => void;
  irbanList: Array<{ id: string; nama: string; kode?: string }>;
  jenisList: JenisPemeriksaan[];
  statusList: StatusRekomendasi[];
  unitList: Array<{ id: string; unit_kerja: string }>;
  isSuperAdminOrBupati: boolean;
};

export function ReportFilterPanel({
  filters,
  onApplyFilters,
  onResetFilters,
  irbanList,
  jenisList,
  statusList,
  unitList,
  isSuperAdminOrBupati,
}: ReportFilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<ReportFilterParams>(filters);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    onApplyFilters(localFilters);
  }

  function handleReset() {
    const defaultFilters: ReportFilterParams = {
      tahun: new Date().getFullYear().toString(),
      irban_id: "",
      simpeg_unit_kerja_id: "",
      jenis_pemeriksaan_id: "",
      status_rekomendasi_id: "",
    };
    setLocalFilters(defaultFilters);
    onResetFilters();
  }

  async function handleExportExcel() {
    try {
      setExportingExcel(true);
      await exportReportExcel(localFilters);
      toast.success("Laporan Excel (CSV) berhasil diunduh.");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setExportingExcel(false);
    }
  }

  async function handleExportPdf() {
    try {
      setExportingPdf(true);
      await exportReportPdf(localFilters);
      toast.success("Laporan PDF Landscape berhasil diunduh.");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line/60 pb-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-brand" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
            Parameter & Filter Laporan Pengawasan
          </h3>
        </div>

        {/* Tombol Export */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            title="Download laporan lengkap format Excel (.csv)"
          >
            {exportingExcel ? (
              <Loader2 size={13} className="animate-spin text-emerald-700" />
            ) : (
              <FileSpreadsheet size={14} className="text-emerald-700" />
            )}
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 px-3 py-1.5 text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            title="Download laporan rekapitulasi format PDF Landscape"
          >
            {exportingPdf ? (
              <Loader2 size={13} className="animate-spin text-rose-700" />
            ) : (
              <FileText size={14} className="text-rose-700" />
            )}
            <span>Export PDF Landscape</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleFilterSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Filter Tahun */}
          <div className="space-y-1">
            <label htmlFor="filter-tahun" className="label text-2xs">Tahun Pemeriksaan</label>
            <select
              id="filter-tahun"
              value={localFilters.tahun || ""}
              onChange={(e) =>
                setLocalFilters((prev) => ({ ...prev, tahun: e.target.value }))
              }
              className="input text-xs"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>

          {/* Filter Irban (Hanya jika Super Admin / Bupati) */}
          {isSuperAdminOrBupati && (
            <div className="space-y-1">
              <label htmlFor="filter-irban" className="label text-2xs">Inspektorat Pembantu (Irban)</label>
              <select
                id="filter-irban"
                value={localFilters.irban_id || ""}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    irban_id: e.target.value,
                  }))
                }
                className="input text-xs"
              >
                <option value="">Semua Irban</option>
                {irbanList.map((irb) => (
                  <option key={irb.id} value={irb.id}>
                    {irb.nama}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filter OPD (Unit Kerja) */}
          <div className="space-y-1">
            <label htmlFor="filter-opd" className="label text-2xs">Perangkat Daerah (OPD)</label>
            <select
              id="filter-opd"
              value={localFilters.simpeg_unit_kerja_id || ""}
              onChange={(e) =>
                setLocalFilters((prev) => ({
                  ...prev,
                  simpeg_unit_kerja_id: e.target.value,
                }))
              }
              className="input text-xs"
            >
              <option value="">Semua Perangkat Daerah</option>
              {unitList.map((uk) => (
                <option key={uk.id} value={uk.id}>
                  {uk.unit_kerja}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Jenis Pemeriksaan */}
          <div className="space-y-1">
            <label htmlFor="filter-jenis" className="label text-2xs">Jenis Pemeriksaan</label>
            <select
              id="filter-jenis"
              value={localFilters.jenis_pemeriksaan_id || ""}
              onChange={(e) =>
                setLocalFilters((prev) => ({
                  ...prev,
                  jenis_pemeriksaan_id: e.target.value,
                }))
              }
              className="input text-xs"
            >
              <option value="">Semua Jenis Pemeriksaan</option>
              {jenisList.map((jp) => (
                <option key={jp.id} value={jp.id}>
                  {jp.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status Rekomendasi */}
          <div className="space-y-1">
            <label htmlFor="filter-status" className="label text-2xs">Status Rekomendasi</label>
            <select
              id="filter-status"
              value={localFilters.status_rekomendasi_id || ""}
              onChange={(e) =>
                setLocalFilters((prev) => ({
                  ...prev,
                  status_rekomendasi_id: e.target.value,
                }))
              }
              className="input text-xs"
            >
              <option value="">Semua Status</option>
              {statusList.map((sr) => (
                <option key={sr.id} value={sr.id}>
                  {sr.nama} ({sr.kategori})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleReset}
            className="button-secondary text-xs flex items-center gap-1.5"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
          <button
            type="submit"
            className="button-primary text-xs flex items-center gap-1.5 shadow-xs"
          >
            <Filter size={13} />
            <span>Terapkan Filter</span>
          </button>
        </div>
      </form>
    </div>
  );
}
