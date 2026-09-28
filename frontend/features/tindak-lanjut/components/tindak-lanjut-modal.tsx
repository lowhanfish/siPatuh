"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Calendar,
  FileUp,
  Loader2,
  Paperclip,
  X,
} from "lucide-react";
import { useCreateTindakLanjut } from "../hooks/use-tindak-lanjut";
import { formatRupiah } from "@/features/dashboard/utils/formatters";
import { getApiErrorMessage } from "@/lib/api-client";

type TindakLanjutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  rekomendasiId: string;
  lhpId?: string;
  rekomendasiUraian: string;
  nomorDisplay: string;
  onSuccess?: () => void;
};

export function TindakLanjutModal({
  isOpen,
  onClose,
  rekomendasiId,
  lhpId,
  rekomendasiUraian,
  nomorDisplay,
  onSuccess,
}: TindakLanjutModalProps) {
  if (!isOpen) return null;

  return (
    <TindakLanjutModalContent
      onClose={onClose}
      rekomendasiId={rekomendasiId}
      lhpId={lhpId}
      rekomendasiUraian={rekomendasiUraian}
      nomorDisplay={nomorDisplay}
      onSuccess={onSuccess}
    />
  );
}

function TindakLanjutModalContent({
  onClose,
  rekomendasiId,
  lhpId,
  rekomendasiUraian,
  nomorDisplay,
  onSuccess,
}: {
  onClose: () => void;
  rekomendasiId: string;
  lhpId?: string;
  rekomendasiUraian: string;
  nomorDisplay: string;
  onSuccess?: () => void;
}) {
  const todayIso = new Date().toISOString().substring(0, 10);
  const [tanggalDiterima, setTanggalDiterima] = useState(todayIso);
  const [uraian, setUraian] = useState("");
  const [nilaiTindakLanjutInput, setNilaiTindakLanjutInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateTindakLanjut(rekomendasiId, lhpId);

  const numericPreview = parseFloat(
    nilaiTindakLanjutInput.replace(/[^0-9.-]+/g, ""),
  );
  const previewFormatted =
    !isNaN(numericPreview) && numericPreview > 0
      ? formatRupiah(numericPreview)
      : null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const newFiles: File[] = [];
    const maxSizeBytes = 20 * 1024 * 1024; // 20 MB

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > maxSizeBytes) {
        toast.error(`Berkas "${file.name}" melebihi batas 20 MB.`);
        continue;
      }
      newFiles.push(file);
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  }

  function handleRemoveFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!tanggalDiterima) {
      setFormError("Tanggal dokumen diterima dari OPD wajib diisi.");
      return;
    }
    if (!uraian.trim()) {
      setFormError("Uraian dokumen tindak lanjut wajib diisi.");
      return;
    }

    let parsedNilai: number | null = null;
    if (nilaiTindakLanjutInput.trim()) {
      const sanitized = nilaiTindakLanjutInput.replace(/[^0-9.-]+/g, "");
      const num = parseFloat(sanitized);
      if (isNaN(num) || num < 0) {
        setFormError("Nilai setoran finansial harus berupa angka valid (tidak negatif).");
        return;
      }
      parsedNilai = num;
    }

    try {
      setFormError(null);

      const formData = new FormData();
      formData.append("tanggal_diterima", tanggalDiterima);
      formData.append("uraian", uraian.trim());
      if (parsedNilai !== null) {
        formData.append("nilai_tindak_lanjut", String(parsedNilai));
      }

      for (const file of selectedFiles) {
        formData.append("files", file);
      }

      await createMutation.mutateAsync(formData);
      toast.success("Catatan tindak lanjut berhasil ditambahkan.");
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
      aria-labelledby="tl-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-xl my-8 rounded-3xl border border-line bg-surface p-6 shadow-panel sm:p-8">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand">
              <FileUp size={18} />
            </span>
            <div>
              <h2 id="tl-modal-title" className="text-lg font-bold text-ink sm:text-xl">
                Catat Tindak Lanjut dari OPD
              </h2>
              <p className="text-xs text-muted">
                Rekomendasi #{nomorDisplay}
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

        {/* Ringkasan Rekomendasi */}
        <div className="mt-4 rounded-xl border border-line/60 bg-canvas/30 p-3 text-xs text-muted">
          <span className="font-semibold text-ink text-2xs uppercase">Rekomendasi:</span>
          <p className="mt-0.5 line-clamp-2 text-ink/80">{rekomendasiUraian}</p>
        </div>

        {formError && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
            <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="space-y-1">
              <p className="font-bold">Gagal Menyimpan Tindak Lanjut</p>
              <p className="text-rose-700">{formError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-ink">
              <Calendar size={13} className="text-brand" />
              <span>Tanggal Dokumen Diterima dari OPD</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={tanggalDiterima}
              onChange={(e) => setTanggalDiterima(e.target.value)}
              className="form-input mt-1.5 text-xs sm:text-sm font-semibold"
              required
            />
            <p className="mt-1 text-2xs text-muted">
              Tanggal fisik berkas/bukti tindak lanjut diterima di loket atau sekretariat Inspektorat.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink">
              Uraian Tindak Lanjut / Bukti yang Diserahkan <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Jelaskan naskah dinas, bukti setor STS, foto fisik, atau dokumen pendukung yang diserahkan oleh OPD..."
              value={uraian}
              onChange={(e) => setUraian(e.target.value)}
              className="form-input mt-1.5 text-xs leading-relaxed"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-ink">
                Nilai Setoran Kas / Pengembalian (Opsional)
              </label>
              {previewFormatted && (
                <span className="text-2xs font-bold text-brand">
                  {previewFormatted}
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder="Contoh: 15000000 (Kosongkan bila bukan tindak lanjut penyetoran uang)"
              value={nilaiTindakLanjutInput}
              onChange={(e) => setNilaiTindakLanjutInput(e.target.value)}
              className="form-input mt-1.5 text-xs font-mono"
            />
          </div>

          {/* Unggah Berkas Multi-file */}
          <div className="rounded-2xl border border-dashed border-line bg-canvas/30 p-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-ink">
                <Paperclip size={14} className="text-brand" />
                <span>Lampiran Berkas Bukti (PDF, Gambar, Dokumen)</span>
              </label>
              <span className="text-2xs text-muted">Maks 20 MB / berkas</span>
            </div>

            <input
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              className="mt-2 text-xs text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-soft file:text-brand hover:file:bg-brand/15 cursor-pointer"
            />

            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <span className="text-2xs font-bold text-ink">Berkas Terpilih ({selectedFiles.length}):</span>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-line bg-surface px-2.5 py-1 text-2xs"
                    >
                      <span className="truncate max-w-[280px] font-medium text-ink">
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="text-muted hover:text-rose-600 transition-colors p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-line pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-muted hover:text-ink transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="button-primary text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 aria-hidden className="animate-spin" size={14} />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Tindak Lanjut</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
