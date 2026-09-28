"use client";

import { BarChart3 } from "lucide-react";
import type { IrbanProgressItem } from "../types";
import { formatPercent, formatRupiah } from "../utils/formatters";

type IrbanProgressComparisonProps = {
  items: IrbanProgressItem[];
};

export function IrbanProgressComparison({
  items,
}: IrbanProgressComparisonProps) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between border-b border-line/60 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-brand" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
            Komparasi Progres Kinerja Antar-Irban
          </h4>
        </div>
        <span className="text-2xs text-muted">
          Evaluasi tindak lanjut rekomendasi per wilayah pembinaan
        </span>
      </div>

      <div className="space-y-4">
        {items.map((irb) => {
          return (
            <div
              key={irb.irban_id}
              className="rounded-2xl border border-line bg-canvas/30 p-4 space-y-2.5 transition-all hover:border-brand/40"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <span className="font-extrabold text-ink text-sm block">
                    {irb.irban_nama}
                  </span>
                  <div className="flex items-center gap-2 text-2xs text-muted mt-0.5">
                    <span>{irb.total_lhp} Dokumen LHP</span>
                    <span>•</span>
                    <span>
                      {irb.selesai} dari {irb.total_rekomendasi} Rekomendasi Selesai
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline gap-2 self-start sm:self-auto">
                  <span className="text-lg font-extrabold text-emerald-800">
                    {formatPercent(irb.persen_selesai)}%
                  </span>
                  <span className="text-2xs text-muted">selesai</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-line rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(0, irb.persen_selesai))}%`,
                  }}
                />
              </div>

              {/* Finansial Summary mini */}
              {irb.nilai_rekomendasi > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-line/40 text-2xs">
                  <span className="text-muted">
                    Kewajiban Setor:{" "}
                    <strong className="text-ink">{formatRupiah(irb.nilai_rekomendasi)}</strong>
                  </span>
                  <span className="text-emerald-800 font-bold">
                    Realisasi Kasda: {formatRupiah(irb.nilai_setor)}
                  </span>
                  <span className="text-rose-800 font-bold">
                    Sisa: {formatRupiah(irb.sisa_rekomendasi)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
