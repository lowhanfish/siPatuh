"use client";

import {
  CheckCircle2,
  Coins,
  FileText,
  Mail,
  ShieldAlert,
} from "lucide-react";
import type { PimpinanDashboardData } from "../types";
import { formatPercent, formatRupiah } from "../utils/formatters";

type PimpinanExecutiveCardsProps = {
  data: PimpinanDashboardData;
};

export function PimpinanExecutiveCards({ data }: PimpinanExecutiveCardsProps) {
  const { summary_kpi: kpi, surat_peringatan_kpi: spKpi } = data;

  return (
    <div className="space-y-4">
      {/* 5 Kartu Ringkasan Eksekutif Pimpinan */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total LHP */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted">
              Laporan Hasil Pemeriksaan (LHP)
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <FileText size={16} />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-ink">{kpi.total_lhp}</p>
          <div className="flex items-center gap-2 text-2xs text-muted">
            <span className="font-bold text-emerald-700">{kpi.lhp_closed} Selesai</span>
            <span>•</span>
            <span className="font-bold text-amber-700">{kpi.lhp_open} Proses</span>
          </div>
        </div>

        {/* Total Temuan Pengawasan */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted">
              Temuan Hasil Pemeriksaan
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <ShieldAlert size={16} />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-ink">{kpi.total_temuan}</p>
          <p className="text-2xs text-muted">
            Mencakup temuan sistem pengendalian internal & kepatuhan
          </p>
        </div>

        {/* Penyelesaian Rekomendasi (%) */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted">
              Tingkat Penyelesaian Rekomendasi
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-emerald-800">
              {formatPercent(kpi.persentase_selesai)}%
            </p>
            <span className="text-2xs font-semibold text-muted">
              ({kpi.rekomendasi_selesai}/{kpi.total_rekomendasi})
            </span>
          </div>
          <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, kpi.persentase_selesai))}%` }}
            />
          </div>
        </div>

        {/* Surat Peringatan (SP) Diterbitkan */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted">
              Surat Peringatan (TTE)
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-rose-50 text-rose-700">
              <Mail size={16} />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-ink">{spKpi.total_issued}</p>
          <div className="flex items-center gap-1.5 text-2xs">
            <span className="rounded bg-blue-50 px-1.5 py-0.5 font-bold text-blue-800">
              SP1: {spKpi.sp1_issued}
            </span>
            <span className="rounded bg-amber-50 px-1.5 py-0.5 font-bold text-amber-800">
              SP2: {spKpi.sp2_issued}
            </span>
            <span className="rounded bg-rose-50 px-1.5 py-0.5 font-bold text-rose-800">
              SP3: {spKpi.sp3_issued}
            </span>
          </div>
        </div>
      </div>

      {/* Banner Keuangan Rekomendasi Kas Daerah */}
      <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-card space-y-3">
        <div className="flex items-center gap-2 border-b border-line/60 pb-3">
          <Coins size={18} className="text-purple-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
            Akuntabilitas Finansial & Pemulihan Kas Daerah
          </h4>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-canvas/30 p-3.5 space-y-1">
            <span className="text-2xs text-muted font-medium">Total Rekomendasi Penyetoran Kas:</span>
            <p className="text-base font-extrabold text-ink">
              {formatRupiah(kpi.total_nilai_rekomendasi)}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-1">
            <span className="text-2xs text-emerald-800 font-medium">Telah Disetor ke Kas Daerah:</span>
            <p className="text-base font-extrabold text-emerald-800">
              {formatRupiah(kpi.total_nilai_setor)}
            </p>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3.5 space-y-1">
            <span className="text-2xs text-rose-800 font-medium">Sisa Tunggakan Belum Disetor:</span>
            <p className="text-base font-extrabold text-rose-800">
              {formatRupiah(kpi.sisa_nilai_rekomendasi)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
