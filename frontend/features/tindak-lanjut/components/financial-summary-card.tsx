"use client";

import { AlertCircle, CheckCircle2, Coins, TrendingUp } from "lucide-react";
import type { FinancialSummary } from "../types";
import { formatPercent, formatRupiah } from "@/features/dashboard/utils/formatters";

type FinancialSummaryCardProps = {
  summary: FinancialSummary | null | undefined;
  isLoading?: boolean;
};

export function FinancialSummaryCard({
  summary,
  isLoading,
}: FinancialSummaryCardProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl border border-line bg-canvas/30 p-4 space-y-2">
        <div className="h-4 bg-line/60 rounded w-1/3" />
        <div className="h-6 bg-line/60 rounded w-1/2" />
      </div>
    );
  }

  if (!summary || summary.nilai_rekomendasi === null || summary.nilai_rekomendasi === undefined) {
    return null;
  }

  const target = Number(summary.nilai_rekomendasi);
  const realized = Number(summary.total_tindak_lanjut);
  const sisa = summary.sisa !== null ? Number(summary.sisa) : Math.max(0, target - realized);
  const percent = summary.persentase !== null ? Number(summary.persentase) : (target > 0 ? (realized / target) * 100 : 0);
  const isLunas = sisa <= 0 && target > 0;

  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
            <Coins size={16} />
          </span>
          <div>
            <h4 className="text-xs font-bold text-emerald-950 sm:text-sm">
              Rekapitulasi Penyetoran Kerugian Daerah
            </h4>
            <p className="text-2xs text-emerald-800">
              Kewajiban pengembalian ke Kas Daerah
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-2xs font-extrabold ${
            isLunas
              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
              : "bg-amber-100 text-amber-800 border border-amber-300"
          }`}
        >
          {isLunas ? <CheckCircle2 size={11} /> : <TrendingUp size={11} />}
          <span>{formatPercent(percent)} Disetor</span>
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-200/60">
          <div
            className={`h-full transition-all duration-500 ${
              isLunas ? "bg-emerald-600" : "bg-brand"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
      </div>

      {/* Nominal Grid */}
      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
        <div className="rounded-xl bg-surface/80 p-2 border border-emerald-100">
          <span className="text-3xs font-semibold text-muted uppercase">Target Rekomendasi</span>
          <p className="mt-0.5 text-xs font-bold text-ink">{formatRupiah(target)}</p>
        </div>
        <div className="rounded-xl bg-surface/80 p-2 border border-emerald-100">
          <span className="text-3xs font-semibold text-emerald-700 uppercase">Telah Disetor</span>
          <p className="mt-0.5 text-xs font-bold text-emerald-700">{formatRupiah(realized)}</p>
        </div>
        <div className="rounded-xl bg-surface/80 p-2 border border-emerald-100">
          <span className="text-3xs font-semibold text-rose-700 uppercase">Sisa Kewajiban</span>
          <p className="mt-0.5 text-xs font-bold text-rose-700">{formatRupiah(sisa)}</p>
        </div>
      </div>

      <div className="flex items-start gap-1.5 text-3xs text-emerald-800/90 leading-tight">
        <AlertCircle size={12} className="shrink-0 text-emerald-700 mt-0.5" />
        <span>
          Catatan: Penyetoran 100% tidak otomatis menetapkan status &quot;Sesuai&quot;. Status akhir tetap menjadi wewenang verifikator manusia setelah memeriksa keabsahan bukti setor fisik.
        </span>
      </div>
    </div>
  );
}
