"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, ListOrdered, Loader2, X } from "lucide-react";
import type {
  KategoriStatusRekomendasi,
  StatusRekomendasi,
} from "@/features/master-data/types";
import {
  useCreateStatusRekomendasi,
  useUpdateStatusRekomendasi,
} from "@/features/master-data/hooks/use-master-data";
import { getApiErrorMessage } from "@/lib/api-client";

type StatusRekomendasiModalProps = {
  item: StatusRekomendasi | null;
  isOpen: boolean;
  onClose: () => void;
};

export function StatusRekomendasiModal({
  item,
  isOpen,
  onClose,
}: StatusRekomendasiModalProps) {
  if (!isOpen) return null;
  return <StatusRekomendasiModalContent item={item} onClose={onClose} />;
}

function StatusRekomendasiModalContent({
  item,
  onClose,
}: {
  item: StatusRekomendasi | null;
  onClose: () => void;
}) {
  const isEditing = !!item;
  const [nama, setNama] = useState(item?.nama || "");
  const [kategori, setKategori] = useState<KategoriStatusRekomendasi>(
    item?.kategori || "BELUM_SELESAI",
  );
  const [urutan, setUrutan] = useState<number>(item?.urutan ?? 1);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateStatusRekomendasi();
  const updateMutation = useUpdateStatusRekomendasi();
  const isPending = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim()) {
      setFormError("Nama status rekomendasi wajib diisi.");
      return;
    }

    try {
      setFormError(null);
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: item.id,
          input: {
            nama: nama.trim(),
            kategori,
            urutan: Number(urutan) || 1,
          },
        });
        toast.success(`Status rekomendasi "${nama.trim()}" berhasil diperbarui.`);
      } else {
        await createMutation.mutateAsync({
          nama: nama.trim(),
          kategori,
          urutan: Number(urutan) || 1,
        });
        toast.success(`Status rekomendasi "${nama.trim()}" berhasil ditambahkan.`);
      }
      onClose();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-rekomendasi-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 backdrop-blur-xs p-4 sm:p-6"
    >
      <div className="flex min-h-full items-start sm:items-center justify-center py-4 sm:py-8">
        <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-panel sm:p-8 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col my-auto">
          <div className="shrink-0 flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand">
                <ListOrdered aria-hidden size={20} />
              </span>
              <div>
                <h2 id="status-rekomendasi-title" className="text-lg font-bold text-ink sm:text-xl">
                  {isEditing ? "Ubah Status Rekomendasi" : "Tambah Status Rekomendasi"}
                </h2>
                <p className="text-xs text-muted">
                  Status dinamis tindak lanjut rekomendasi audit
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-xl text-muted hover:bg-canvas hover:text-ink transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden mt-4">
            <div className="overflow-y-auto pr-1 -mr-1 py-1 space-y-4 flex-1 min-h-0">
              {formError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle className="size-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="status-nama" className="form-label text-xs">
                  Nama Status *
                </label>
                <input
                  id="status-nama"
                  type="text"
                  placeholder="mis. Sesuai Rekomendasi, Belum Sesuai, Belum Ditindaklanjuti..."
                  value={nama}
                  onChange={(e) => {
                    setNama(e.target.value);
                    setFormError(null);
                  }}
                  className="form-input text-xs sm:text-sm"
                  required
                  autoFocus
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="status-kategori" className="form-label text-xs">
                    Kategori Global *
                  </label>
                  <select
                    id="status-kategori"
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value as KategoriStatusRekomendasi)}
                    className="form-input text-xs sm:text-sm cursor-pointer"
                  >
                    <option value="BELUM_SELESAI">BELUM SELESAI</option>
                    <option value="SELESAI">SELESAI</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="status-urutan" className="form-label text-xs">
                    Urutan Tampilan *
                  </label>
                  <input
                    id="status-urutan"
                    type="number"
                    min={1}
                    value={urutan}
                    onChange={(e) => setUrutan(parseInt(e.target.value, 10) || 1)}
                    className="form-input text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              <p className="text-2xs text-muted leading-relaxed">
                Kategori <strong>SELESAI</strong> akan menghitung rekomendasi sebagai tuntas pada kalkulasi SP Due & persentase penyelesaian LHP.
              </p>
            </div>

            <div className="shrink-0 flex items-center justify-end gap-3 border-t border-line/60 pt-4 mt-4 bg-surface">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-semibold text-muted hover:text-ink transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="button-primary text-xs sm:text-sm flex items-center gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 aria-hidden className="animate-spin" size={14} />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>{isEditing ? "Simpan Perubahan" : "Simpan Data"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
