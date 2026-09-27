"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Edit2,
  Filter,
  ListOrdered,
  Loader2,
  Plus,
  Power,
  Search,
  XCircle,
} from "lucide-react";
import type { StatusRekomendasi } from "@/features/master-data/types";
import { useUpdateStatusRekomendasi } from "@/features/master-data/hooks/use-master-data";
import { formatTanggalIndo } from "@/features/dashboard/utils/formatters";
import { getApiErrorMessage } from "@/lib/api-client";

type StatusRekomendasiTableProps = {
  items: StatusRekomendasi[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (item: StatusRekomendasi) => void;
};

export function StatusRekomendasiTable({
  items,
  isLoading,
  onAdd,
  onEdit,
}: StatusRekomendasiTableProps) {
  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const updateMutation = useUpdateStatusRekomendasi();

  const filtered = items.filter((item) => {
    if (search.trim() && !item.nama.toLowerCase().includes(search.trim().toLowerCase())) {
      return false;
    }
    if (filterKategori !== "all" && item.kategori !== filterKategori) return false;
    if (filterActive === "active" && !item.is_active) return false;
    if (filterActive === "inactive" && item.is_active) return false;
    return true;
  });

  async function handleToggleActive(item: StatusRekomendasi) {
    try {
      setTogglingId(item.id);
      await updateMutation.mutateAsync({
        id: item.id,
        input: { is_active: !item.is_active },
      });
      toast.success(
        `Status rekomendasi "${item.nama}" berhasil di${item.is_active ? "nonaktifkan" : "aktifkan"}.`,
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setTogglingId(null);
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
            placeholder="Cari status rekomendasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-10 text-xs sm:text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1 text-xs font-semibold text-muted">
            <Filter size={13} />
            Filter:
          </span>

          <select
            aria-label="Filter kategori status rekomendasi"
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className="rounded-xl border border-line bg-canvas/60 px-3 py-2 text-xs font-semibold text-ink outline-none cursor-pointer"
          >
            <option value="all">Semua Kategori</option>
            <option value="SELESAI">SELESAI</option>
            <option value="BELUM_SELESAI">BELUM SELESAI</option>
          </select>

          <select
            aria-label="Filter status aktif rekomendasi"
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
            <span>Tambah Status</span>
          </button>
        </div>
      </div>

      {/* Tabel */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="animate-spin text-brand" size={28} />
            <p className="mt-3 text-xs text-muted">Memuat data master status rekomendasi...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ListOrdered className="text-muted" size={28} />
            <p className="mt-3 text-sm font-semibold text-ink">Tidak ada status rekomendasi</p>
            <p className="mt-1 max-w-sm text-xs text-muted">
              Belum ada status rekomendasi yang cocok dengan kriteria pencarian.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-muted">
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider text-center w-16">
                    Urutan
                  </th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    Nama Status Rekomendasi
                  </th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    Kategori Global
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
                    <td className="px-4 py-3.5 text-center font-bold text-muted font-mono">
                      #{item.urutan}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-ink sm:text-sm">{item.nama}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      {item.kategori === "SELESAI" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-700">
                          <CheckCircle2 size={13} />
                          SELESAI
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 font-bold text-amber-700">
                          <Clock size={13} />
                          BELUM SELESAI
                        </span>
                      )}
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
                          title="Ubah data status"
                        >
                          <Edit2 size={13} />
                          <span>Ubah</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          disabled={togglingId === item.id}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-semibold shadow-xs transition-colors ${
                            item.is_active
                              ? "border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100"
                              : "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                          title={item.is_active ? "Nonaktifkan status" : "Aktifkan status"}
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
          <span>Menampilkan {filtered.length} dari total {items.length} status rekomendasi</span>
          <span>Kategori mengendalikan perhitungan otomatis ketercapaian tindak lanjut</span>
        </div>
      </div>
    </div>
  );
}
