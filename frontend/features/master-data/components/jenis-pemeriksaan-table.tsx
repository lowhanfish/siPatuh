"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Edit2,
  Filter,
  Loader2,
  Plus,
  Power,
  Search,
  XCircle,
} from "lucide-react";
import type { JenisPemeriksaan } from "@/features/master-data/types";
import { useUpdateJenisPemeriksaan } from "@/features/master-data/hooks/use-master-data";
import { formatTanggalIndo } from "@/features/dashboard/utils/formatters";
import { getApiErrorMessage } from "@/lib/api-client";

type JenisPemeriksaanTableProps = {
  items: JenisPemeriksaan[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (item: JenisPemeriksaan) => void;
};

export function JenisPemeriksaanTable({
  items,
  isLoading,
  onAdd,
  onEdit,
}: JenisPemeriksaanTableProps) {
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deactivatingItem, setDeactivatingItem] = useState<JenisPemeriksaan | null>(null);

  const updateMutation = useUpdateJenisPemeriksaan();

  const filtered = items.filter((item) => {
    if (search.trim() && !item.nama.toLowerCase().includes(search.trim().toLowerCase())) {
      return false;
    }
    if (filterActive === "active" && !item.is_active) return false;
    if (filterActive === "inactive" && item.is_active) return false;
    return true;
  });

  async function executeToggle(item: JenisPemeriksaan) {
    try {
      setTogglingId(item.id);
      await updateMutation.mutateAsync({
        id: item.id,
        input: { is_active: !item.is_active },
      });
      toast.success(
        `Jenis pemeriksaan "${item.nama}" berhasil di${item.is_active ? "nonaktifkan" : "aktifkan"}.`,
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setTogglingId(null);
      setDeactivatingItem(null);
    }
  }

  function handleToggleClick(item: JenisPemeriksaan) {
    if (item.is_active) {
      setDeactivatingItem(item);
    } else {
      executeToggle(item);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar Filter */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search
            aria-hidden
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            size={16}
          />
          <input
            type="text"
            placeholder="Cari jenis pemeriksaan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-10 text-xs sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1 text-xs font-semibold text-muted">
            <Filter size={13} />
            Filter:
          </span>

          <select
            aria-label="Filter status jenis pemeriksaan"
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="rounded-xl border border-line bg-canvas/60 px-3 py-2 text-xs font-semibold text-ink outline-none cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="active">Hanya Aktif</option>
            <option value="inactive">Hanya Nonaktif</option>
          </select>

          <button
            type="button"
            onClick={onAdd}
            className="button-primary text-xs sm:text-sm flex items-center gap-1.5 shrink-0"
          >
            <Plus size={15} />
            <span>Tambah Jenis</span>
          </button>
        </div>
      </div>

      {/* Tabel */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="animate-spin text-brand" size={28} />
            <p className="mt-3 text-xs text-muted">Memuat data master jenis pemeriksaan...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="text-muted" size={28} />
            <p className="mt-3 text-sm font-semibold text-ink">Tidak ada jenis pemeriksaan</p>
            <p className="mt-1 max-w-sm text-xs text-muted">
              Belum ada jenis pemeriksaan yang cocok dengan kriteria pencarian.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-muted">
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    Nama Jenis Pemeriksaan
                  </th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    Terakhir Diperbarui
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
                {filtered.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-canvas/40">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-ink sm:text-sm">{item.nama}</div>
                    </td>

                    <td className="px-4 py-3.5 text-muted">
                      {formatTanggalIndo(item.updated_at)}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700">
                          <CheckCircle2 size={12} />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-600">
                          <XCircle size={12} />
                          Nonaktif
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 font-semibold text-ink hover:border-brand hover:text-brand shadow-xs transition-colors"
                          title="Ubah nama jenis pemeriksaan"
                        >
                          <Edit2 size={13} />
                          <span>Ubah</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleClick(item)}
                          disabled={togglingId === item.id}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-semibold shadow-xs transition-colors ${
                            item.is_active
                              ? "border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100"
                              : "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                          title={item.is_active ? "Nonaktifkan jenis pemeriksaan" : "Aktifkan jenis pemeriksaan"}
                        >
                          {togglingId === item.id ? (
                            <Loader2 className="animate-spin" size={13} />
                          ) : (
                            <Power size={13} />
                          )}
                          <span>{item.is_active ? "Nonaktifkan" : "Aktifkan"}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-line/60 bg-canvas/30 px-4 py-3 text-xs text-muted">
          <span>Menampilkan {filtered.length} dari total {items.length} jenis pemeriksaan</span>
          <span>Digunakan saat pembuatan dokumen LHP baru</span>
        </div>
      </div>

      {/* Modal Konfirmasi Nonaktifkan */}
      {deactivatingItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 shadow-panel">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                <AlertTriangle size={20} />
              </span>
              <h3 className="text-base font-bold text-ink">Nonaktifkan Jenis Pemeriksaan?</h3>
            </div>

            <p className="mt-3 text-xs text-muted leading-relaxed">
              Apakah Anda yakin ingin menonaktifkan jenis pemeriksaan{" "}
              <span className="font-semibold text-ink">&quot;{deactivatingItem.nama}&quot;</span>?
              Data historis tetap aman, namun opsi ini tidak akan muncul pada pembuatan LHP baru.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeactivatingItem(null)}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-muted hover:text-ink transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeToggle(deactivatingItem)}
                disabled={togglingId === deactivatingItem.id}
                className="button-primary bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white shadow-xs flex items-center gap-1.5"
              >
                {togglingId === deactivatingItem.id ? (
                  <>
                    <Loader2 aria-hidden className="animate-spin" size={13} />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Ya, Nonaktifkan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
