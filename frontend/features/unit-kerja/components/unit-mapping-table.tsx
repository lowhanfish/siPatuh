"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Filter,
  Layers,
  Link2Off,
  Loader2,
  Search,
  UserCheck,
} from "lucide-react";
import type { AssignedIrban, SimpegUnitKerjaItem } from "@/features/unit-kerja/types";
import { useUnassignUnitKerja } from "@/features/unit-kerja/hooks/use-unit-kerja";
import { getApiErrorMessage } from "@/lib/api-client";

type UnitMappingTableProps = {
  units: SimpegUnitKerjaItem[];
  isLoading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  irbans: AssignedIrban[];
  onAssignUnit: (unit: SimpegUnitKerjaItem) => void;
  onSelectUnitForPejabat?: (unit: SimpegUnitKerjaItem) => void;
};

export function UnitMappingTable({
  units,
  isLoading,
  search,
  onSearchChange,
  irbans,
  onAssignUnit,
  onSelectUnitForPejabat,
}: UnitMappingTableProps) {
  const [filterAssignment, setFilterAssignment] = useState<string>("all");
  const [filterIrban, setFilterIrban] = useState<string>("all");
  const [unassigningUnit, setUnassigningUnit] = useState<SimpegUnitKerjaItem | null>(null);

  const unassignMutation = useUnassignUnitKerja();

  const filteredUnits = units.filter((u) => {
    if (filterAssignment === "assigned" && !u.is_assigned) return false;
    if (filterAssignment === "unassigned" && u.is_assigned) return false;
    if (filterIrban !== "all" && u.assigned_irban?.id !== filterIrban) return false;
    return true;
  });

  async function handleConfirmUnassign() {
    if (!unassigningUnit || !unassigningUnit.mapping_id) return;

    try {
      await unassignMutation.mutateAsync(unassigningUnit.mapping_id);
      toast.success(
        `Penugasan Unit Kerja ${unassigningUnit.unit_kerja} berhasil dilepas.`,
      );
      setUnassigningUnit(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar Filter */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            aria-hidden
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            size={16}
          />
          <input
            type="text"
            placeholder="Cari nama Organisasi / Unit Kerja SIMPEG..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="form-input pl-10 text-xs sm:text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1 text-xs font-semibold text-muted">
            <Filter size={13} />
            Filter:
          </span>

          <select
            aria-label="Filter status pemetaan"
            value={filterAssignment}
            onChange={(e) => setFilterAssignment(e.target.value)}
            className="rounded-xl border border-line bg-canvas/60 px-3 py-2 text-xs font-semibold text-ink outline-none cursor-pointer"
          >
            <option value="all">Semua Status Mapping</option>
            <option value="assigned">Sudah Ditugaskan ke Irban</option>
            <option value="unassigned">Belum Ditugaskan</option>
          </select>

          <select
            aria-label="Filter wilayah Irban"
            value={filterIrban}
            onChange={(e) => setFilterIrban(e.target.value)}
            className="rounded-xl border border-line bg-canvas/60 px-3 py-2 text-xs font-semibold text-ink outline-none cursor-pointer"
          >
            <option value="all">Semua Irban</option>
            {irbans.map((irb, idx) => (
              <option key={irb.id || `irban-${idx}`} value={irb.id}>
                {irb.nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabel Mapping */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="animate-spin text-brand" size={28} />
            <p className="mt-3 text-xs text-muted">Memuat data Unit Kerja dari SIMPEG...</p>
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Layers className="text-muted" size={28} />
            <p className="mt-3 text-sm font-semibold text-ink">Tidak ada Unit Kerja ditemukan</p>
            <p className="mt-1 max-w-sm text-xs text-muted">
              Coba sesuaikan kata kunci pencarian atau bersihkan filter di atas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-muted">
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    Unit Kerja / OPD (SIMPEG)
                  </th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    ID SIMPEG
                  </th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    Wilayah Irban Penugasan
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
                {filteredUnits.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-canvas/40">
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        <p className="font-bold text-ink sm:text-sm">{u.unit_kerja}</p>
                        <div className="flex flex-wrap items-center gap-1.5 text-2xs text-muted">
                          {u.sub_unit_count !== undefined && u.sub_unit_count > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-2 py-0.5 font-semibold text-brand">
                              <Layers size={11} /> {u.sub_unit_count} Sub-Unit Terhubung
                            </span>
                          )}
                        </div>
                      </div>
                    </td>


                    <td className="px-4 py-3.5 font-mono text-muted">
                      {u.id}
                    </td>

                    <td className="px-4 py-3.5">
                      {u.assigned_irban ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-brand">
                          <Building2 size={13} />
                          {u.assigned_irban.nama} ({u.assigned_irban.kode})
                        </span>
                      ) : (
                        <span className="font-medium text-muted">Belum Ditugaskan</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {u.is_assigned ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700">
                          <CheckCircle2 size={12} />
                          Terpetakan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-700">
                          <span className="size-1.5 rounded-full bg-amber-500" />
                          Menunggu
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {onSelectUnitForPejabat && (
                          <button
                            type="button"
                            onClick={() => onSelectUnitForPejabat(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 font-semibold text-ink hover:border-brand hover:text-brand shadow-xs transition-colors"
                            title="Kelola pejabat untuk OPD ini"
                          >
                            <UserCheck size={13} />
                            <span>Pejabat</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onAssignUnit(u)}
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 font-semibold text-brand hover:border-brand shadow-xs transition-colors"
                          title="Tugaskan atau pindahkan ke wilayah Irban"
                        >
                          <Building2 size={13} />
                          <span>{u.is_assigned ? "Pindah Irban" : "Tugaskan"}</span>
                        </button>

                        {u.is_assigned && u.mapping_id && (
                          <button
                            type="button"
                            onClick={() => setUnassigningUnit(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1 font-semibold text-rose-700 hover:bg-rose-100 shadow-xs transition-colors"
                            title="Lepas pemetaan dari Irban"
                          >
                            <Link2Off size={13} />
                            <span>Lepas</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-line/60 bg-canvas/30 px-4 py-3 text-xs text-muted">
          <span>Menampilkan {filteredUnits.length} Unit Kerja Induk (SIMPEG unit_induk=1)</span>
          <span>Perubahan pemetaan tidak mengubah kepemilikan LHP historis</span>
        </div>
      </div>

      {/* Modal Konfirmasi Lepas Penugasan */}
      {unassigningUnit && (
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
              <h3 className="text-base font-bold text-ink">Lepas Pemetaan Unit?</h3>
            </div>

            <p className="mt-3 text-xs text-muted leading-relaxed">
              Apakah Anda yakin ingin melepas pemetaan{" "}
              <span className="font-semibold text-ink">{unassigningUnit.unit_kerja}</span>{" "}
              dari {unassigningUnit.assigned_irban?.nama}? Unit ini tidak akan terikat ke Irban manapun sampai ditugaskan kembali.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setUnassigningUnit(null)}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-muted hover:text-ink transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmUnassign}
                disabled={unassignMutation.isPending}
                className="button-primary bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-xs flex items-center gap-1.5"
              >
                {unassignMutation.isPending ? (
                  <>
                    <Loader2 aria-hidden className="animate-spin" size={13} />
                    <span>Melepas...</span>
                  </>
                ) : (
                  <span>Ya, Lepas Pemetaan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
