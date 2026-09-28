"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, AlertTriangle, Building2, CheckCircle2, Loader2, X } from "lucide-react";
import type { AssignedIrban, SimpegUnitKerjaItem } from "@/features/unit-kerja/types";
import { useAssignUnitKerja } from "@/features/unit-kerja/hooks/use-unit-kerja";
import { getApiErrorMessage } from "@/lib/api-client";

type AssignIrbanModalProps = {
  unitKerja: SimpegUnitKerjaItem | null;
  isOpen: boolean;
  onClose: () => void;
  irbans: AssignedIrban[];
};

export function AssignIrbanModal({
  unitKerja,
  isOpen,
  onClose,
  irbans,
}: AssignIrbanModalProps) {
  if (!isOpen || !unitKerja) return null;
  return (
    <AssignIrbanModalContent
      unitKerja={unitKerja}
      onClose={onClose}
      irbans={irbans}
    />
  );
}

function AssignIrbanModalContent({
  unitKerja,
  onClose,
  irbans,
}: {
  unitKerja: SimpegUnitKerjaItem;
  onClose: () => void;
  irbans: AssignedIrban[];
}) {
  const [selectedIrbanId, setSelectedIrbanId] = useState<string>(
    unitKerja.assigned_irban?.id || (irbans.length > 0 ? irbans[0].id : ""),
  );
  const [formError, setFormError] = useState<string | null>(null);

  const assignMutation = useAssignUnitKerja();
  const isConflict =
    unitKerja.is_assigned &&
    unitKerja.assigned_irban &&
    unitKerja.assigned_irban.id !== selectedIrbanId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedIrbanId) {
      setFormError("Silakan pilih salah satu wilayah Irban.");
      return;
    }

    try {
      setFormError(null);
      await assignMutation.mutateAsync({
        simpeg_unit_kerja_id: unitKerja.id,
        irban_id: selectedIrbanId,
      });

      toast.success(
        `Unit Kerja ${unitKerja.unit_kerja} berhasil ditugaskan ke Irban.`,
      );
      onClose();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-irban-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 backdrop-blur-xs p-4 sm:p-6"
    >
      <div className="flex min-h-full items-start sm:items-center justify-center py-4 sm:py-8">
        <div className="w-full max-w-lg rounded-3xl border border-line bg-surface p-6 shadow-panel sm:p-8 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col my-auto">
          <div className="shrink-0 flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand">
                <Building2 aria-hidden size={20} />
              </span>
              <div>
                <h2 id="assign-irban-title" className="text-lg font-bold text-ink sm:text-xl">
                  Penugasan Unit Kerja ke Irban
                </h2>
                <p className="text-xs text-muted">
                  Tentukan pembagian wilayah pengawasan Inspektur Pembantu
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
              {/* Informasi Unit Kerja dari SIMPEG */}
              <div className="rounded-xl border border-line bg-canvas/40 p-4 space-y-1 text-xs">
                <span className="font-semibold uppercase tracking-wider text-muted">
                  Data Unit Kerja (SIMPEG)
                </span>
                <p className="text-sm font-bold text-ink">{unitKerja.unit_kerja}</p>
                <div className="flex flex-wrap items-center gap-2 text-muted">
                  <span>ID: {unitKerja.id}</span>
                  {unitKerja.instansi && <span>• {unitKerja.instansi}</span>}
                </div>
              </div>

              {/* Feedback Konflik Pemindahan jika sudah ditugaskan */}
              {unitKerja.is_assigned && unitKerja.assigned_irban && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Status Saat Ini:</strong> Unit Kerja ini terdaftar di bawah{" "}
                    <span className="font-bold">{unitKerja.assigned_irban.nama}</span>.
                    {isConflict &&
                      " Memilih Irban yang berbeda akan memindahkan kepemilikan unit kerja secara otomatis."}
                  </p>
                </div>
              )}

              {formError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle className="size-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="select-target-irban" className="form-label text-xs">
                  Pilih Wilayah Irban Tujuan *
                </label>
                <div className="relative">
                  <Building2
                    aria-hidden
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                    size={16}
                  />
                  <select
                    id="select-target-irban"
                    value={selectedIrbanId}
                    onChange={(e) => {
                      setSelectedIrbanId(e.target.value);
                      setFormError(null);
                    }}
                    className="form-input pl-10 text-xs sm:text-sm cursor-pointer"
                    required
                  >
                    <option value="">-- Pilih Wilayah Irban --</option>
                    {irbans.map((irb, idx) => (
                      <option key={irb.id || `irban-${idx}`} value={irb.id}>
                        {irb.nama} ({irb.kode})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-muted">
                  Satu Unit Kerja hanya dapat ditugaskan ke satu Irban aktif pada satu waktu.
                </p>
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
                disabled={assignMutation.isPending}
                className="button-primary text-xs sm:text-sm flex items-center gap-1.5"
              >
                {assignMutation.isPending ? (
                  <>
                    <Loader2 aria-hidden className="animate-spin" size={14} />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Simpan Penugasan</span>
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
