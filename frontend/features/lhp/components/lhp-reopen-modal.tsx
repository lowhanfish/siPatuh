"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import type { LhpListItem } from "../types";
import { useReopenLhp } from "../hooks/use-lhp";
import { getApiErrorMessage } from "@/lib/api-client";

type LhpReopenModalProps = {
  lhp: LhpListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function LhpReopenModal({
  lhp,
  isOpen,
  onClose,
  onSuccess,
}: LhpReopenModalProps) {
  if (!isOpen || !lhp) return null;

  return (
    <LhpReopenModalContent
      lhp={lhp}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function LhpReopenModalContent({
  lhp,
  onClose,
  onSuccess,
}: {
  lhp: LhpListItem;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [alasan, setAlasan] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reopenMutation = useReopenLhp();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!alasan.trim()) {
      setErrorMsg("Alasan pembukaan kembali LHP wajib diisi.");
      return;
    }

    try {
      setErrorMsg(null);
      await reopenMutation.mutateAsync({
        id: lhp.id,
        input: { alasan: alasan.trim() },
      });

      toast.success(`LHP ${lhp.nomor_lhp} berhasil dibuka kembali (reopened).`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err));
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lhp-reopen-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 backdrop-blur-xs p-4 sm:p-6"
    >
      <div className="flex min-h-full items-start sm:items-center justify-center py-4 sm:py-8">
        <div className="w-full max-w-lg rounded-3xl border border-line bg-surface p-6 shadow-panel sm:p-8 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col my-auto">
          <div className="shrink-0 flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-amber-50 text-amber-700">
                <RotateCcw size={20} />
              </span>
              <div>
                <h2 id="lhp-reopen-title" className="text-base font-bold text-ink sm:text-lg">
                  Buka Kembali Dokumen LHP
                </h2>
                <p className="text-xs text-muted">
                  {lhp.nomor_lhp} • {lhp.unit_kerja_nama}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line bg-surface p-2 text-muted hover:text-ink transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden mt-4">
            <div className="overflow-y-auto pr-1 -mr-1 py-1 space-y-4 flex-1 min-h-0">
              {errorMsg && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
                  <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-600" />
                  <p>{errorMsg}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-ink">
                  Alasan Pembukaan Kembali <span className="text-rose-500">*</span>
                </label>
                <p className="mt-0.5 text-2xs text-muted">
                  Wajib dicatat untuk penelusuran audit trail integritas pengawasan Inspektorat.
                </p>
                <textarea
                  rows={4}
                  placeholder="Jelaskan alasan pembukaan kembali, misalnya: Penambahan dokumen tindak lanjut susulan, revisi rekomendasi atas arahan pimpinan, dll..."
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  className="form-input mt-2 text-xs leading-relaxed"
                  required
                />
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-end gap-3 border-t border-line pt-4 mt-4 bg-surface">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-muted hover:text-ink transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={reopenMutation.isPending}
                className="button-primary bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white shadow-xs flex items-center gap-1.5"
              >
                {reopenMutation.isPending ? (
                  <>
                    <Loader2 aria-hidden className="animate-spin" size={14} />
                    <span>Membuka Kembali...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    <span>Buka Kembali LHP</span>
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
