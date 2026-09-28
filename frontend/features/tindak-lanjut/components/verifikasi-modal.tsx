"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  FileCheck2,
  FileUp,
  Loader2,
  X,
} from "lucide-react";
import { useCreateVerifikasi } from "../hooks/use-tindak-lanjut";
import { useStatusRekomendasiList } from "@/features/master-data/hooks/use-master-data";
import { getApiErrorMessage } from "@/lib/api-client";

type VerifikasiModalProps = {
  isOpen: boolean;
  onClose: () => void;
  rekomendasiId: string;
  lhpId?: string;
  tindakLanjutId: string;
  nomorDisplay: string;
  tindakLanjutUraian: string;
  currentStatusId?: string;
  onSuccess?: () => void;
};

export function VerifikasiModal({
  isOpen,
  onClose,
  rekomendasiId,
  lhpId,
  tindakLanjutId,
  nomorDisplay,
  tindakLanjutUraian,
  currentStatusId,
  onSuccess,
}: VerifikasiModalProps) {
  if (!isOpen) return null;

  return (
    <VerifikasiModalContent
      onClose={onClose}
      rekomendasiId={rekomendasiId}
      lhpId={lhpId}
      tindakLanjutId={tindakLanjutId}
      nomorDisplay={nomorDisplay}
      tindakLanjutUraian={tindakLanjutUraian}
      currentStatusId={currentStatusId}
      onSuccess={onSuccess}
    />
  );
}

function VerifikasiModalContent({
  onClose,
  rekomendasiId,
  lhpId,
  tindakLanjutId,
  nomorDisplay,
  tindakLanjutUraian,
  currentStatusId,
  onSuccess,
}: {
  onClose: () => void;
  rekomendasiId: string;
  lhpId?: string;
  tindakLanjutId: string;
  nomorDisplay: string;
  tindakLanjutUraian: string;
  currentStatusId?: string;
  onSuccess?: () => void;
}) {
  const { data: statusList = [] } = useStatusRekomendasiList(false);

  const activeStatusList = useMemo(() => {
    return statusList.filter((s) => s.is_active || s.id === currentStatusId);
  }, [statusList, currentStatusId]);

  const [catatan, setCatatan] = useState("");
  const [selectedStatusId, setSelectedStatusId] = useState(
    currentStatusId || (activeStatusList.length > 0 ? activeStatusList[0].id : ""),
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const verifikasiMutation = useCreateVerifikasi(rekomendasiId, lhpId);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setFormError("Ukuran berkas melebihi batas maksimum 20 MB.");
      setSelectedFile(null);
      return;
    }

    setFormError(null);
    setSelectedFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!catatan.trim()) {
      setFormError("Catatan hasil verifikasi wajib diisi (tidak boleh kosong atau hanya spasi).");
      return;
    }
    if (!selectedStatusId) {
      setFormError("Status rekomendasi hasil verifikasi wajib dipilih.");
      return;
    }

    try {
      setFormError(null);

      const formData = new FormData();
      formData.append("catatan", catatan.trim());
      formData.append("status_rekomendasi_id", selectedStatusId);
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      await verifikasiMutation.mutateAsync({
        tindakLanjutId,
        formData,
      });

      toast.success("Verifikasi tindak lanjut berhasil dicatat dan status rekomendasi diperbarui.");
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
      aria-labelledby="verif-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-xl my-8 rounded-3xl border border-line bg-surface p-6 shadow-panel sm:p-8">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
              <FileCheck2 size={18} />
            </span>
            <div>
              <h2 id="verif-modal-title" className="text-lg font-bold text-ink sm:text-xl">
                Verifikasi Manual Tindak Lanjut
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

        {/* Ringkasan Dokumen TL yang diperiksa */}
        <div className="mt-4 rounded-xl border border-line/60 bg-canvas/30 p-3 text-xs text-muted">
          <span className="font-semibold text-ink text-2xs uppercase">Dokumen Tindak Lanjut OPD:</span>
          <p className="mt-0.5 line-clamp-2 text-ink/80">{tindakLanjutUraian}</p>
        </div>

        {formError && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
            <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="space-y-1">
              <p className="font-bold">Gagal Menyimpan Verifikasi</p>
              <p className="text-rose-700">{formError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink">
              Catatan Hasil Verifikasi Lapangan / Dokumen <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Catat evaluasi substantif inspektur pemeriksa: Apakah dokumen bukti fisik sah, bukti setor telah divalidasi Bank/Kasda, atau masih ada kekurangan..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="form-input mt-1.5 text-xs leading-relaxed"
              required
            />
            <p className="mt-1 text-2xs text-muted">
              Wajib diisi sebagai pertanggungjawaban verifikator manusia.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink">
              Tetapkan Status Rekomendasi Hasil Verifikasi <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedStatusId}
              onChange={(e) => setSelectedStatusId(e.target.value)}
              className="form-input mt-1.5 text-xs sm:text-sm font-semibold cursor-pointer"
              required
            >
              {activeStatusList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} ({s.kategori === "SELESAI" ? "Kategori Selesai" : "Belum Selesai"})
                </option>
              ))}
            </select>
            <p className="mt-1 text-2xs text-muted">
              Status rekomendasi induk akan otomatis diperbarui mengikuti keputusan verifikator ini.
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-line bg-canvas/30 p-4">
            <label className="flex items-center gap-1.5 text-xs font-bold text-ink">
              <FileUp size={14} className="text-brand" />
              <span>Unggah Berkas Bukti Verifikasi (Opsional)</span>
            </label>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={handleFileChange}
              className="mt-2 text-xs text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-soft file:text-brand hover:file:bg-brand/15 cursor-pointer"
            />
            {selectedFile && (
              <p className="mt-1.5 text-2xs font-semibold text-emerald-700">
                ✓ {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
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
              disabled={verifikasiMutation.isPending}
              className="button-primary bg-emerald-700 hover:bg-emerald-800 text-xs font-bold text-white shadow-xs flex items-center gap-1.5"
            >
              {verifikasiMutation.isPending ? (
                <>
                  <Loader2 aria-hidden className="animate-spin" size={14} />
                  <span>Menyimpan Verifikasi...</span>
                </>
              ) : (
                <>
                  <FileCheck2 size={14} />
                  <span>Simpan Hasil Verifikasi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
