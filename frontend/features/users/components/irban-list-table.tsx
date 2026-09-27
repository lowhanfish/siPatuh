"use client";

import { Building2, Edit2, Loader2 } from "lucide-react";
import type { Irban } from "@/features/users/types";
import { formatTanggalIndo } from "@/features/dashboard/utils/formatters";

type IrbanListTableProps = {
  irbans: Irban[];
  isLoading: boolean;
  onEditIrban: (irban: Irban) => void;
};

export function IrbanListTable({
  irbans,
  isLoading,
  onEditIrban,
}: IrbanListTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-ink sm:text-lg">
            Wilayah Kerja Inspektur Pembantu (Irban)
          </h3>
          <p className="mt-1 text-xs text-muted">
            Struktur 5 Irban Inspektorat Daerah Kabupaten Konawe Selatan
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="animate-spin text-brand" size={28} />
            <p className="mt-3 text-xs text-muted">Memuat data Irban...</p>
          </div>
        ) : irbans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="text-muted" size={28} />
            <p className="mt-3 text-sm font-semibold text-ink">Tidak ada data Irban</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-muted">
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">Kode</th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">Nama Wilayah Irban</th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">Cakupan / Keterangan</th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">Diperbarui</th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {irbans.map((irb) => (
                  <tr key={irb.id} className="transition-colors hover:bg-canvas/40">
                    <td className="px-4 py-3.5 font-mono font-bold text-brand">
                      {irb.kode}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-ink sm:text-sm">
                      {irb.nama}
                    </td>
                    <td className="px-4 py-3.5 text-muted">
                      {irb.keterangan || "-"}
                    </td>
                    <td className="px-4 py-3.5 text-muted">
                      {formatTanggalIndo(irb.updated_at)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => onEditIrban(irb)}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 font-semibold text-ink hover:border-brand hover:text-brand shadow-xs transition-colors"
                      >
                        <Edit2 size={13} />
                        <span>Ubah</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-line/60 bg-canvas/30 px-4 py-3 text-xs text-muted">
          Master 5 Irban bersifat permanen. Perubahan nama tidak mengubah integritas snapshot LHP lama.
        </div>
      </div>
    </div>
  );
}
