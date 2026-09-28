"use client";

import { AlertTriangle, Building2 } from "lucide-react";
import type { TopOpdOutstandingItem } from "../types";
import { formatPercent, formatRupiah } from "../utils/formatters";

type TopOpdOutstandingTableProps = {
  items: TopOpdOutstandingItem[];
};

export function TopOpdOutstandingTable({
  items,
}: TopOpdOutstandingTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-card">
        <Building2 className="mx-auto size-10 text-muted/60" />
        <p className="mt-2 text-xs font-bold text-ink">
          Tidak ada data tunggakan rekomendasi perangkat daerah
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface shadow-card overflow-hidden space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 sm:p-5 border-b border-line bg-canvas/30">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2">
            <AlertTriangle size={15} className="text-rose-600" />
            <span>Top 5 Perangkat Daerah dengan Rekomendasi Tertunggak</span>
          </h4>
          <p className="text-2xs text-muted">
            Prioritas pengawasan dan tindak lanjut berdasarkan jumlah kewajiban yang belum diselesaikan
          </p>
        </div>
        <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-2xs font-extrabold text-rose-800 border border-rose-200 self-start sm:self-auto">
          Atensi Khusus Pimpinan
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-line bg-canvas/60 text-2xs font-bold uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3.5 w-12 text-center">#</th>
              <th className="px-4 py-3.5">Perangkat Daerah (OPD)</th>
              <th className="px-4 py-3.5 text-center">Belum Selesai</th>
              <th className="px-4 py-3.5">Tingkat Penyelesaian (%)</th>
              <th className="px-4 py-3.5 text-right">Nilai Rekomendasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {items.map((opd, idx) => {
              const rank = idx + 1;
              const rankColor =
                rank === 1
                  ? "bg-rose-100 text-rose-800 border-rose-300"
                  : rank === 2
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : "bg-slate-100 text-slate-800 border-slate-300";

              return (
                <tr key={opd.simpeg_unit_kerja_id} className="hover:bg-canvas/30 transition-colors">
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`grid size-6 place-items-center rounded-full text-2xs font-extrabold border ${rankColor}`}
                    >
                      {rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-ink block">{opd.nama_opd}</span>
                    <span className="text-[10px] text-muted">
                      Total kewajiban: {opd.total_rekomendasi} rekomendasi
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-2xs font-bold text-rose-800 border border-rose-200">
                      {opd.belum_selesai} Rekomendasi
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1 w-32">
                      <div className="flex items-center justify-between text-2xs">
                        <span className="font-bold text-ink">
                          {formatPercent(opd.persen_selesai)}%
                        </span>
                        <span className="text-[10px] text-muted">
                          ({opd.selesai}/{opd.total_rekomendasi})
                        </span>
                      </div>
                      <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, opd.persen_selesai))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-ink whitespace-nowrap">
                    {opd.nilai_rekomendasi > 0 ? (
                      formatRupiah(opd.nilai_rekomendasi)
                    ) : (
                      <span className="text-muted text-2xs">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
