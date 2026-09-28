"use client";

import { AlertTriangle, Calendar, Clock, FileWarning, Loader2, PlusCircle, ShieldAlert } from "lucide-react";
import type { SpEligibilityResult } from "../types";
import { formatTanggalIndo } from "@/features/dashboard/utils/formatters";

type SpDueTableProps = {
  dueList: SpEligibilityResult[];
  isLoading: boolean;
  canCreate: boolean;
  onSelectLhpForSp: (lhp: SpEligibilityResult) => void;
};

export function SpDueTable({
  dueList,
  isLoading,
  canCreate,
  onSelectLhpForSp,
}: SpDueTableProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Loader2 className="animate-spin text-brand" size={32} />
        <p className="mt-3 text-xs text-muted">Memuat daftar LHP jatuh tempo SP...</p>
      </div>
    );
  }

  if (dueList.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center shadow-card">
        <ShieldAlert className="mx-auto size-12 text-emerald-600/70" />
        <h4 className="mt-3 text-base font-bold text-ink">Tidak Ada LHP Jatuh Tempo</h4>
        <p className="mt-1 text-xs text-muted max-w-md mx-auto">
          Seluruh LHP berada dalam batas waktu penyelesaian yang wajar (&lt; 30 hari kalender) atau seluruh rekomendasinya telah ditindaklanjuti dan selesai diverifikasi.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-line bg-canvas/60 text-2xs font-bold uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3.5">LHP & OPD Tujuan</th>
              <th className="px-4 py-3.5">Tgl Terima LHP</th>
              <th className="px-4 py-3.5">Umur Hari</th>
              <th className="px-4 py-3.5">Rekomendasi Tertunggak</th>
              <th className="px-4 py-3.5">Riwayat SP</th>
              <th className="px-4 py-3.5">Status Kelayakan</th>
              <th className="px-4 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {dueList.map((item) => {
              const eligibleBadgeColor =
                item.eligible_level === "SP3"
                  ? "bg-rose-100 text-rose-800 border-rose-300"
                  : item.eligible_level === "SP2"
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : "bg-blue-100 text-blue-800 border-blue-300";

              return (
                <tr key={item.lhp_id} className="hover:bg-canvas/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <span className="font-bold text-ink block">{item.nomor_lhp}</span>
                    <span className="text-2xs text-muted">
                      {item.unit_kerja_nama || "Perangkat Daerah"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-muted whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-muted/70" />
                      <span>{formatTanggalIndo(item.tanggal_diterima_lhp)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Clock size={13} className="text-amber-600" />
                      <span className={item.age_days >= 60 ? "text-rose-700" : "text-amber-800"}>
                        {item.age_days} hari
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-2xs font-bold text-amber-800 border border-amber-200">
                      <AlertTriangle size={11} />
                      <span>
                        {item.pending_rekomendasi_count} dari {item.total_rekomendasi} belum selesai
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {item.existing_sp_levels.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.existing_sp_levels.map((lvl) => (
                          <span
                            key={lvl}
                            className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200"
                          >
                            {lvl}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-2xs text-muted italic">Belum pernah</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {item.eligible_level ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-2xs font-extrabold border ${eligibleBadgeColor}`}
                      >
                        <FileWarning size={12} />
                        <span>Due {item.eligible_level}</span>
                      </span>
                    ) : (
                      <span className="text-2xs text-muted">Selesai terbit</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    {canCreate && item.eligible_level && (
                      <button
                        type="button"
                        onClick={() => onSelectLhpForSp(item)}
                        className="button-primary text-xs inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <PlusCircle size={13} />
                        <span>Buat {item.eligible_level}</span>
                      </button>
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
