"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import type { TemuanItem } from "../types";
import {
  useCreateTemuan,
  useUpdateTemuan,
} from "../hooks/use-temuan-rekomendasi";
import { formatRupiah } from "@/features/dashboard/utils/formatters";
import { getApiErrorMessage } from "@/lib/api-client";

type TemuanModalProps = {
  isOpen: boolean;
  onClose: () => void;
  lhpId: string;
  temuan: TemuanItem | null; // null jika mode tambah
  onSuccess?: () => void;
};

export function TemuanModal({
  isOpen,
  onClose,
  lhpId,
  temuan,
  onSuccess,
}: TemuanModalProps) {
  if (!isOpen) return null;

  return (
    <TemuanModalContent
      onClose={onClose}
      lhpId={lhpId}
      temuan={temuan}
      onSuccess={onSuccess}
    />
  );
}

function TemuanModalContent({
  onClose,
  lhpId,
  temuan,
  onSuccess,
}: {
  onClose: () => void;
  lhpId: string;
  temuan: TemuanItem | null;
  onSuccess?: () => void;
}) {
  const isEditing = !!temuan;

  const [judul, setJudul] = useState(temuan?.judul || "");
  const [uraian, setUraian] = useState(temuan?.uraian || "");
  const [nilaiTemuanInput, setNilaiTemuanInput] = useState(
    temuan?.nilai_temuan !== null && temuan?.nilai_temuan !== undefined
      ? String(temuan.nilai_temuan)
      : "",
  );
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateTemuan(lhpId);
  const updateMutation = useUpdateTemuan(lhpId);
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Nilai rupiah terformat preview jika ada
  const numericPreview = parseFloat(
    nilaiTemuanInput.replace(/[^0-9.-]+/g, ""),
  );
  const previewFormatted =
    !isNaN(numericPreview) && numericPreview > 0
      ? formatRupiah(numericPreview)
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!judul.trim()) {
      setFormError("Judul temuan wajib diisi.");
      return;
    }
    if (!uraian.trim()) {
      setFormError("Uraian temuan wajib diisi.");
      return;
    }

    let parsedNilai: number | null = null;
    if (nilaiTemuanInput.trim()) {
      const sanitized = nilaiTemuanInput.replace(/[^0-9.-]+/g, "");
      const num = parseFloat(sanitized);
      if (isNaN(num) || num < 0) {
        setFormError("Nilai temuan finansial harus berupa angka valid (tidak negatif).");
        return;
      }
      parsedNilai = num;
    }

    try {
      setFormError(null);

      if (isEditing) {
        await updateMutation.mutateAsync({
          id: temuan.id,
          input: {
            judul: judul.trim(),
            uraian: uraian.trim(),
            nilai_temuan: parsedNilai,
          },
        });
        toast.success(`Temuan #${temuan.nomor_urut} berhasil diperbarui.`);
      } else {
        await createMutation.mutateAsync({
          judul: judul.trim(),
          uraian: uraian.trim(),
          nilai_temuan: parsedNilai,
        });
        toast.success("Temuan baru berhasil ditambahkan.");
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="temuan-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 backdrop-blur-xs p-4 sm:p-6"
    >
      <div className="flex min-h-full items-start sm:items-center justify-center py-4 sm:py-8">
        <div className="w-full max-w-xl rounded-3xl border border-line bg-surface p-6 shadow-panel sm:p-8 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col my-auto">
          <div className="shrink-0 flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand">
                <FileText size={18} />
              </span>
              <div>
                <h2 id="temuan-modal-title" className="text-lg font-bold text-ink sm:text-xl">
                  {isEditing ? `Ubah Temuan #${temuan.nomor_urut}` : "Tambah Temuan Pemeriksaan"}
                </h2>
                <p className="text-xs text-muted">
                  {isEditing
                    ? "Perbarui substansi atau nilai temuan hasil pengawasan"
                    : "Nomor urut temuan akan dihasilkan otomatis berurutan (1..n)"}
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
              {formError && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
                  <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-600" />
                  <div className="space-y-1">
                    <p className="font-bold">Gagal Menyimpan Temuan</p>
                    <p className="text-rose-700">{formError}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-ink">
                  Judul Temuan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pengelolaan Kas dan Pertanggungjawaban Belanja Belum Tertib"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  className="form-input mt-1.5 text-xs sm:text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink">
                  Uraian Kondisi Temuan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Uraikan kondisi factual, kriteria yang dilanggar, sebab, dan akibat dari temuan hasil pemeriksaan..."
                  value={uraian}
                  onChange={(e) => setUraian(e.target.value)}
                  className="form-input mt-1.5 text-xs leading-relaxed"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-ink">
                    Nilai Kerugian / Temuan Finansial (Opsional)
                  </label>
                  {previewFormatted && (
                    <span className="text-2xs font-bold text-brand">
                      {previewFormatted}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Contoh: 50000000 (Kosongkan bila temuan non-finansial)"
                  value={nilaiTemuanInput}
                  onChange={(e) => setNilaiTemuanInput(e.target.value)}
                  className="form-input mt-1.5 text-xs font-mono"
                />
                <p className="mt-1 text-2xs text-muted">
                  Bersifat opsional. Masukkan nominal rupiah jika temuan mengandung potensi kerugian daerah atau kekurangan volume.
                </p>
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
                disabled={isPending}
                className="button-primary text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 aria-hidden className="animate-spin" size={14} />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>{isEditing ? "Simpan Perubahan" : "Tambah Temuan"}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
