"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

type DeleteConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  isPending: boolean;
};

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isPending,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
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
          <h3 className="text-base font-bold text-ink">{title}</h3>
        </div>

        <p className="mt-3 text-xs text-muted leading-relaxed">{message}</p>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-muted hover:text-ink transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="button-primary bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-xs flex items-center gap-1.5"
          >
            {isPending ? (
              <>
                <Loader2 aria-hidden className="animate-spin" size={13} />
                <span>Menghapus...</span>
              </>
            ) : (
              <span>Ya, Hapus</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
