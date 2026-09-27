"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, ClipboardList, Loader2, X } from "lucide-react";
import type { JenisPemeriksaan } from "@/features/master-data/types";
import {
  useCreateJenisPemeriksaan,
  useUpdateJenisPemeriksaan,
} from "@/features/master-data/hooks/use-master-data";
import { getApiErrorMessage } from "@/lib/api-client";

type JenisPemeriksaanModalProps = {
  item: JenisPemeriksaan | null;
  isOpen: boolean;
  onClose: () => void;
};

export function JenisPemeriksaanModal({
  item,
  isOpen,
  onClose,
}: JenisPemeriksaanModalProps) {
  if (!isOpen) return null;
  return <JenisPemeriksaanModalContent item={item} onClose={onClose} />;
}

function JenisPemeriksaanModalContent({
  item,
  onClose,
}: {
  item: JenisPemeriksaan | null;
  onClose: () => void;
}) {
  const isEditing = !!item;
  const [nama, setNama] = useState(item?.nama || "");
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateJenisPemeriksaan();
  const updateMutation = useUpdateJenisPemeriksaan();
  const isPending = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim()) {
      setFormError("Nama jenis pemeriksaan wajib diisi.");
      return;
    }

    try {
      setFormError(null);
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: item.id,
          input: { nama: nama.trim() },
        });
        toast.success(`Jenis pemeriksaan "${nama.trim()}" berhasil diperbarui.`);
      } else {
        await createMutation.mutateAsync({
          nama: nama.trim(),
        });
        toast.success(`Jenis pemeriksaan "${nama.trim()}" berhasil ditambahkan.`);
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
      aria-labelledby="jenis-pemeriksaan-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-panel sm:p-8">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand">
              <ClipboardList aria-hidden size={20} />
            </span>
            <div>
              <h2 id="jenis-pemeriksaan-title" className="text-lg font-bold text-ink sm:text-xl">
                {isEditing ? "Ubah Jenis Pemeriksaan" : "Tambah Jenis Pemeriksaan"}
              </h2>
              <p className="text-xs text-muted">
                Kategori penugasan audit dan pengawasan LHP
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="jenis-nama" className="form-label text-xs">
              Nama Jenis Pemeriksaan *
            </label>
            <input
              id="jenis-nama"
              type="text"
              placeholder="mis. Audit Ketaatan, Audit Kinerja, DTT..."
              value={nama}
              onChange={(e) => {
                setNama(e.target.value);
                setFormError(null);
              }}
              className="form-input text-xs sm:text-sm"
              required
              autoFocus
            />
            <p className="text-2xs text-muted">
              Nama jenis pemeriksaan harus unik di dalam sistem.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-line/60 pt-4">
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
  );
}
