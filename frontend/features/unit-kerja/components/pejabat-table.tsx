"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Edit2,
  Filter,
  Loader2,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import type { PejabatUnitKerja, SimpegUnitKerjaItem } from "@/features/unit-kerja/types";
import { PenugasanBadge } from "./penugasan-badge";
import { useDeletePejabat } from "@/features/unit-kerja/hooks/use-pejabat";
import { formatTanggalIndo } from "@/features/dashboard/utils/formatters";
import { getApiErrorMessage } from "@/lib/api-client";

type PejabatTableProps = {
  pejabatList: PejabatUnitKerja[];
  isLoading: boolean;
  units: SimpegUnitKerjaItem[];
  selectedUnitId: string;
  onUnitChange: (unitId: string) => void;
  selectedActiveStatus: string;
  onActiveStatusChange: (status: string) => void;
  onAddPejabat: () => void;
  onEditPejabat: (pejabat: PejabatUnitKerja) => void;
};

export function PejabatTable({
  pejabatList,
  isLoading,
  units,
  selectedUnitId,
  onUnitChange,
  selectedActiveStatus,
  onActiveStatusChange,
  onAddPejabat,
  onEditPejabat,
}: PejabatTableProps) {
  const [deletingPejabat, setDeletingPejabat] = useState<PejabatUnitKerja | null>(null);
  const deleteMutation = useDeletePejabat();

  const unitMap = new Map(units.map((u) => [u.id, u.unit_kerja]));

  async function handleConfirmDelete() {
    if (!deletingPejabat) return;

    try {
      await deleteMutation.mutateAsync(deletingPejabat.id);
      toast.success(`Data pejabat ${deletingPejabat.nama} berhasil dihapus.`);
      setDeletingPejabat(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar Filter & Tambah */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1 text-xs font-semibold text-muted">
            <Filter size={13} />
            Filter:
          </span>

          <div className="relative min-w-[240px]">
            <Building2
              aria-hidden
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              size={14}
            />
            <select
              aria-label="Filter unit kerja pejabat"
              value={selectedUnitId}
              onChange={(e) => onUnitChange(e.target.value)}
              className="form-input pl-9 py-1.5 text-xs font-semibold text-ink outline-none cursor-pointer"
            >
              <option value="">Semua Unit Kerja</option>
              {units.map((u, idx) => (
                <option key={u.id || `unit-opt-${idx}`} value={u.id}>
                  {u.unit_kerja}
                </option>
              ))}
            </select>
          </div>

          <select
            aria-label="Filter status aktif pejabat"
            value={selectedActiveStatus}
            onChange={(e) => onActiveStatusChange(e.target.value)}
            className="rounded-xl border border-line bg-canvas/60 px-3 py-2 text-xs font-semibold text-ink outline-none cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="true">Hanya Aktif</option>
            <option value="false">Hanya Nonaktif</option>
          </select>
        </div>

        <button
          type="button"
          onClick={onAddPejabat}
          className="button-primary text-xs sm:text-sm flex items-center gap-1.5 shrink-0"
        >
          <UserPlus size={15} />
          <span>Tambah Pejabat OPD</span>
        </button>
      </div>

      {/* Tabel Pejabat */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="animate-spin text-brand" size={28} />
            <p className="mt-3 text-xs text-muted">Memuat daftar pejabat...</p>
          </div>
        ) : pejabatList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="text-muted" size={28} />
            <p className="mt-3 text-sm font-semibold text-ink">Belum ada data pejabat</p>
            <p className="mt-1 max-w-sm text-xs text-muted">
              Klik &quot;Tambah Pejabat OPD&quot; untuk mendaftarkan Kepala Dinas atau Pejabat berwenang.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-muted">
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    Pejabat (Nama & NIP)
                  </th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    Jabatan & Unit Kerja
                  </th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    Penugasan
                  </th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    Masa Tugas
                  </th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider text-center">
                    Status
                  </th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {pejabatList.map((p) => {
                  const unitName =
                    unitMap.get(p.simpeg_unit_kerja_id) ||
                    `Unit #${p.simpeg_unit_kerja_id}`;

                  return (
                    <tr key={p.id} className="transition-colors hover:bg-canvas/40">
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <p className="font-bold text-ink sm:text-sm">{p.nama}</p>
                          <p className="text-muted font-mono">NIP: {p.nip}</p>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-ink">{p.jabatan}</p>
                          <p className="text-muted">{unitName}</p>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <PenugasanBadge jenis={p.jenis_penugasan} />
                      </td>

                      <td className="px-4 py-3.5 text-muted">
                        <span>{formatTanggalIndo(p.tanggal_mulai)}</span>
                        <span> s.d. </span>
                        <span>
                          {p.tanggal_selesai
                            ? formatTanggalIndo(p.tanggal_selesai)
                            : "Sekarang"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {p.is_active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700">
                            <CheckCircle2 size={12} />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-600">
                            <XCircle size={12} />
                            Selesai
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditPejabat(p)}
                            className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 font-semibold text-ink hover:border-brand hover:text-brand shadow-xs transition-colors"
                            title="Ubah data pejabat"
                          >
                            <Edit2 size={13} />
                            <span>Ubah</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingPejabat(p)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1 font-semibold text-rose-700 hover:bg-rose-100 shadow-xs transition-colors"
                            title="Hapus data pejabat"
                          >
                            <Trash2 size={13} />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-line/60 bg-canvas/30 px-4 py-3 text-xs text-muted">
          <span>Menampilkan {pejabatList.length} pejabat terdaftar</span>
          <span>Dapat memiliki lebih dari 1 penugasan (definitif dan PLT lintas OPD)</span>
        </div>
      </div>

      {/* Modal Konfirmasi Hapus Pejabat */}
      {deletingPejabat && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 shadow-panel">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-rose-50 text-rose-600">
                <AlertTriangle size={20} />
              </span>
              <h3 className="text-base font-bold text-ink">Hapus Data Pejabat?</h3>
            </div>

            <p className="mt-3 text-xs text-muted leading-relaxed">
              Apakah Anda yakin ingin menghapus pejabat{" "}
              <span className="font-semibold text-ink">{deletingPejabat.nama}</span>{" "}
              ({deletingPejabat.jabatan})? Tindakan ini akan dicatat dalam audit trail.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingPejabat(null)}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-muted hover:text-ink transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="button-primary bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-xs flex items-center gap-1.5"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 aria-hidden className="animate-spin" size={13} />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <span>Ya, Hapus Pejabat</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
