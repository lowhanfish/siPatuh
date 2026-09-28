"use client";

import {
  CheckCircle2,
  Coins,
  FileText,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import type { ReportMetrics } from "../types";
import { formatPercent, formatRupiah } from "@/features/dashboard/utils/formatters";

type ReportSummaryCardsProps = {
  metrics: ReportMetrics;
};

export function ReportSummaryCards({ metrics }: ReportSummaryCardsProps) {
  return (
    <div className="space-y-4">
      {/* 4 Kartu Metrik Utama */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total LHP */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted">
              Total Dokumen LHP
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <FileText size={16} />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-ink">{metrics.total_lhp}</p>
          <div className="flex items-center gap-2 text-2xs text-muted">
            <span className="text-emerald-700 font-bold">{metrics.lhp_closed} Selesai</span>
            <span>•</span>
            <span className="text-amber-700 font-bold">{metrics.lhp_open} Proses</span>
          </div>
        </div>

        {/* Total Temuan & Nominal Kerugian */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted">
              Temuan Pemeriksaan
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <ShieldAlert size={16} />
            </span>
          </div>
          <p className="text-2xl font-extrabold text-ink">{metrics.total_temuan}</p>
          <p className="text-2xs text-muted truncate">
            Nilai Kerugian: <span className="font-bold text-amber-900">{formatRupiah(metrics.total_nilai_temuan)}</span>
          </p>
        </div>

        {/* Rekomendasi & Persentase Selesai */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted">
              Penyelesaian Rekomendasi
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-emerald-800">
              {formatPercent(metrics.persentase_selesai)}%
            </p>
            <span className="text-2xs font-semibold text-muted">
              ({metrics.rekomendasi_selesai}/{metrics.total_rekomendasi})
            </span>
          </div>
          <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, metrics.persentase_selesai))}%` }}
            />
          </div>
        </div>

        {/* Pemulihan Keuangan Daerah */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-muted">
              Pemulihan Kas Daerah
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-purple-50 text-purple-700">
              <Coins size={16} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-purple-900">
              {formatPercent(metrics.persentase_keuangan_selesai)}%
            </p>
            <span className="text-2xs font-semibold text-muted">Terselamatkan</span>
          </div>
          <p className="text-2xs text-muted truncate">
            Disetor: <span className="font-bold text-emerald-800">{formatRupiah(metrics.total_nilai_setor)}</span>
          </p>
        </div>
      </div>

      {/* Banner Rekap Finansial Lengkap */}
      <div className="rounded-2xl border border-line bg-canvas/40 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-brand" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
            Rekapitulasi Akuntabilitas Finansial Daerah
          </h4>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-surface p-3 space-y-1">
            <span className="text-2xs text-muted font-medium">Total Rekomendasi Kas Daerah:</span>
            <p className="text-base font-extrabold text-ink">
              {formatRupiah(metrics.total_nilai_rekomendasi)}
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-3 space-y-1">
            <span className="text-2xs text-muted font-medium">Realisasi Setoran ke Kasda:</span>
            <p className="text-base font-extrabold text-emerald-700">
              {formatRupiah(metrics.total_nilai_setor)}
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-3 space-y-1">
            <span className="text-2xs text-muted font-medium">Sisa Tunggakan Kewajiban:</span>
            <p className="text-base font-extrabold text-rose-700">
              {formatRupiah(metrics.sisa_nilai_rekomendasi)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
