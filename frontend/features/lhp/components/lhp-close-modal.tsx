"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  FileCheck,
  Loader2,
  Lock,
} from "lucide-react";
import type { LhpListItem } from "../types";
import { useCloseLhp, useLhpDetail } from "../hooks/use-lhp";
import { getApiErrorMessage } from "@/lib/api-client";

type LhpCloseModalProps = {
  lhp: LhpListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function LhpCloseModal({
  lhp,
  isOpen,
  onClose,
  onSuccess,
}: LhpCloseModalProps) {
  if (!isOpen || !lhp) return null;

  return (
    <LhpCloseModalContent
      lhp={lhp}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function LhpCloseModalContent({
  lhp,
  onClose,
  onSuccess,
}: {
  lhp: LhpListItem;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ambil detail LHP untuk memeriksa apakah ada rekomendasi yang belum selesai
  const { data: detail } = useLhpDetail(lhp.id);
  const closeMutation = useCloseLhp();

  // Hitung jumlah rekomendasi yang belum selesai
  let pendingRekomendasiCount = 0;
  if (detail?.temuans) {
    for (const t of detail.temuans) {
      for (const r of t.rekomendasis) {
        if (r.status_rekomendasi?.kategori === "BELUM_SELESAI") {
          pendingRekomendasiCount++;
        }
      }
    }
  }

  async function handleConfirmClose() {
    try {
      setErrorMsg(null);
      await closeMutation.mutateAsync(lhp.id);
      toast.success(`LHP ${lhp.nomor_lhp} berhasil ditandai selesai (closed).`);
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
      aria-labelledby="lhp-close-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 backdrop-blur-xs p-4 sm:p-6"
    >
      <div className="flex min-h-full items-start sm:items-center justify-center py-4 sm:py-8">
        <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-panel max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col my-auto">
          <div className="shrink-0 flex items-center gap-3 border-b border-line pb-4">
            <span className="grid size-10 place-items-center rounded-2xl bg-slate-100 text-slate-800">
              <Lock size={20} />
            </span>
            <div>
              <h3 id="lhp-close-title" className="text-base font-bold text-ink">
                Tandai LHP Selesai?
              </h3>
              <p className="text-xs text-muted">
                {lhp.nomor_lhp} • {lhp.unit_kerja_nama}
              </p>
            </div>
          </div>

          <div className="overflow-y-auto pr-1 -mr-1 py-1 space-y-4 flex-1 min-h-0 mt-4">
            {errorMsg && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {errorMsg}
              </div>
            )}

            <p className="text-xs text-muted leading-relaxed">
              Menandai selesai akan mengunci pembaruan data LHP ini. LHP hanya dapat dibuka kembali di kemudian hari oleh Super Admin dengan mencantumkan alasan resmi.
            </p>

            {pendingRekomendasiCount > 0 && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold">Perhatian: Rekomendasi Belum Selesai</p>
                  <p className="mt-0.5 text-2xs leading-relaxed text-amber-800">
                    Masih terdapat <span className="font-bold">{pendingRekomendasiCount}</span> rekomendasi yang belum berstatus selesai. Anda tetap dapat menyelesaikan LHP ini apabila seluruh kewajiban formal pengawasan telah tercapai.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 mt-6 flex items-center justify-end gap-2.5 border-t border-line pt-4 bg-surface">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-muted hover:text-ink transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              onClick={handleConfirmClose}
              disabled={closeMutation.isPending}
              className="button-primary bg-slate-800 hover:bg-slate-900 text-xs font-bold text-white shadow-xs flex items-center gap-1.5"
            >
              {closeMutation.isPending ? (
                <>
                  <Loader2 aria-hidden className="animate-spin" size={13} />
                  <span>Menutup LHP...</span>
                </>
              ) : (
                <>
                  <FileCheck size={14} />
                  <span>Ya, Tandai Selesai</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
