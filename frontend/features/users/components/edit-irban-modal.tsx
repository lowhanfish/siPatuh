"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Building2, CheckCircle2, Loader2, X } from "lucide-react";
import type { Irban } from "@/features/users/types";
import { useUpdateIrban } from "@/features/users/hooks/use-irbans";
import { getApiErrorMessage } from "@/lib/api-client";

type EditIrbanModalProps = {
  irban: Irban | null;
  isOpen: boolean;
  onClose: () => void;
};

export function EditIrbanModal({ irban, isOpen, onClose }: EditIrbanModalProps) {
  if (!isOpen || !irban) return null;
  return <EditIrbanModalContent irban={irban} onClose={onClose} />;
}

function EditIrbanModalContent({
  irban,
  onClose,
}: {
  irban: Irban;
  onClose: () => void;
}) {
  const [nama, setNama] = useState(irban.nama);
  const [keterangan, setKeterangan] = useState(irban.keterangan || "");
  const [formError, setFormError] = useState<string | null>(null);

  const updateMutation = useUpdateIrban();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim()) {
      setFormError("Nama Irban tidak boleh kosong.");
      return;
    }

    try {
      setFormError(null);
      await updateMutation.mutateAsync({
        id: irban.id,
        input: {
          nama: nama.trim(),
          keterangan: keterangan.trim() || undefined,
        },
      });

      toast.success(`Data ${nama.trim()} berhasil diperbarui.`);
      onClose();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-irban-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 backdrop-blur-xs p-4 sm:p-6"
    >
      <div className="flex min-h-full items-start sm:items-center justify-center py-4 sm:py-8">
        <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-panel sm:p-8 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col my-auto">
          <div className="shrink-0 flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand">
                <Building2 aria-hidden size={20} />
              </span>
              <div>
                <h2 id="edit-irban-title" className="text-lg font-bold text-ink sm:text-xl">
                  Ubah Wilayah Irban
                </h2>
                <p className="text-xs text-muted">
                  Kode internal: <span className="font-semibold text-ink">{irban.kode}</span>
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
                <label htmlFor="nama-irban" className="form-label text-xs">
                  Nama Wilayah Irban *
                </label>
                <input
                  id="nama-irban"
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="form-input text-xs sm:text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ket-irban" className="form-label text-xs">
                  Keterangan / Cakupan Pengawasan (Opsional)
                </label>
                <textarea
                  id="ket-irban"
                  rows={3}
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="form-input text-xs sm:text-sm resize-none"
                  placeholder="Contoh: Bidang Pemerintahan dan Aparatur Desa..."
                />
              </div>
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
                disabled={updateMutation.isPending}
                className="button-primary text-xs sm:text-sm flex items-center gap-1.5"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 aria-hidden className="animate-spin" size={14} />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Simpan Perubahan</span>
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
