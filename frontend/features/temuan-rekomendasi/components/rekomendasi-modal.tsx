"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  FileCheck2,
  Loader2,
  X,
} from "lucide-react";
import type { RekomendasiItem, TemuanItem } from "../types";
import type { StatusRekomendasi } from "@/features/master-data/types";
import {
  useCreateRekomendasi,
  useUpdateRekomendasi,
} from "../hooks/use-temuan-rekomendasi";
import { formatRupiah } from "@/features/dashboard/utils/formatters";
import { getApiErrorMessage } from "@/lib/api-client";

type RekomendasiModalProps = {
  isOpen: boolean;
  onClose: () => void;
  lhpId: string;
  temuan: TemuanItem;
  rekomendasi: RekomendasiItem | null; // null jika mode tambah
  statusList: StatusRekomendasi[];
  onSuccess?: () => void;
};

export function RekomendasiModal({
  isOpen,
  onClose,
  lhpId,
  temuan,
  rekomendasi,
  statusList,
  onSuccess,
}: RekomendasiModalProps) {
  if (!isOpen) return null;

  return (
    <RekomendasiModalContent
      onClose={onClose}
      lhpId={lhpId}
      temuan={temuan}
      rekomendasi={rekomendasi}
      statusList={statusList}
      onSuccess={onSuccess}
    />
  );
}

function RekomendasiModalContent({
  onClose,
  lhpId,
  temuan,
  rekomendasi,
  statusList,
  onSuccess,
}: {
  onClose: () => void;
  lhpId: string;
  temuan: TemuanItem;
  rekomendasi: RekomendasiItem | null;
  statusList: StatusRekomendasi[];
  onSuccess?: () => void;
}) {
  const isEditing = !!rekomendasi;

  // Saring status rekomendasi yang aktif, tetapi jika sedang edit dan status yang lama nonaktif, tetap masukkan
  const activeStatusList = useMemo(() => {
    return statusList.filter(
      (s) => s.is_active || s.id === rekomendasi?.status_rekomendasi_id,
    );
  }, [statusList, rekomendasi?.status_rekomendasi_id]);

  // Default status: cari yang belum selesai (mis. 'Belum Sesuai' atau item pertama)
  const defaultStatusId = useMemo(() => {
    if (rekomendasi?.status_rekomendasi_id) {
      return rekomendasi.status_rekomendasi_id;
    }
    const belumSelesai = activeStatusList.find(
      (s) => s.kategori === "BELUM_SELESAI",
    );
    return belumSelesai ? belumSelesai.id : activeStatusList[0]?.id || "";
  }, [rekomendasi, activeStatusList]);

  const [uraian, setUraian] = useState(rekomendasi?.uraian || "");
  const [statusId, setStatusId] = useState(defaultStatusId);
  const [nilaiRekomendasiInput, setNilaiRekomendasiInput] = useState(
    rekomendasi?.nilai_rekomendasi !== null && rekomendasi?.nilai_rekomendasi !== undefined
      ? String(rekomendasi.nilai_rekomendasi)
      : "",
  );
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateRekomendasi(lhpId);
  const updateMutation = useUpdateRekomendasi(lhpId);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const numericPreview = parseFloat(
    nilaiRekomendasiInput.replace(/[^0-9.-]+/g, ""),
  );
  const previewFormatted =
    !isNaN(numericPreview) && numericPreview > 0
      ? formatRupiah(numericPreview)
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!uraian.trim()) {
      setFormError("Uraian rekomendasi wajib diisi.");
      return;
    }
    if (!statusId) {
      setFormError("Status rekomendasi wajib dipilih.");
      return;
    }

    let parsedNilai: number | null = null;
    if (nilaiRekomendasiInput.trim()) {
      const sanitized = nilaiRekomendasiInput.replace(/[^0-9.-]+/g, "");
      const num = parseFloat(sanitized);
      if (isNaN(num) || num < 0) {
        setFormError("Nilai rekomendasi finansial harus berupa angka valid (tidak negatif).");
        return;
      }
      parsedNilai = num;
    }

    try {
      setFormError(null);

      if (isEditing) {
        await updateMutation.mutateAsync({
          id: rekomendasi.id,
          input: {
            uraian: uraian.trim(),
            status_rekomendasi_id: statusId,
            nilai_rekomendasi: parsedNilai,
          },
        });
        toast.success(`Rekomendasi #${rekomendasi.nomor_urut} berhasil diperbarui.`);
      } else {
        await createMutation.mutateAsync({
          temuanId: temuan.id,
          input: {
            uraian: uraian.trim(),
            status_rekomendasi_id: statusId,
            nilai_rekomendasi: parsedNilai,
          },
        });
        toast.success("Rekomendasi baru berhasil ditambahkan.");
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
      aria-labelledby="rekomendasi-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 backdrop-blur-xs p-4 sm:p-6"
    >
      <div className="flex min-h-full items-start sm:items-center justify-center py-4 sm:py-8">
        <div className="w-full max-w-xl rounded-3xl border border-line bg-surface p-6 shadow-panel sm:p-8 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col my-auto">
          <div className="shrink-0 flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand">
                <FileCheck2 size={18} />
              </span>
              <div>
                <h2 id="rekomendasi-modal-title" className="text-lg font-bold text-ink sm:text-xl">
                  {isEditing
                    ? `Ubah Rekomendasi #${temuan.nomor_urut}.${rekomendasi.nomor_urut}`
                    : `Tambah Rekomendasi untuk Temuan #${temuan.nomor_urut}`}
                </h2>
                <p className="text-xs text-muted truncate max-w-md">
                  {temuan.judul}
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
                    <p className="font-bold">Gagal Menyimpan Rekomendasi</p>
                    <p className="text-rose-700">{formError}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-ink">
                  Uraian Rekomendasi <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Uraikan tindakan perbaikan konkret yang diinstruksikan kepada OPD yang diperiksa..."
                  value={uraian}
                  onChange={(e) => setUraian(e.target.value)}
                  className="form-input mt-1.5 text-xs leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink">
                  Status Rekomendasi Awal <span className="text-rose-500">*</span>
                </label>
                <select
                  value={statusId}
                  onChange={(e) => setStatusId(e.target.value)}
                  className="form-input mt-1.5 text-xs sm:text-sm font-semibold cursor-pointer"
                  required
                >
                  {activeStatusList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama} ({s.kategori === "SELESAI" ? "Kategori Selesai" : "Belum Selesai"})
                      {!s.is_active ? " - Nonaktif" : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-2xs text-muted">
                  Pilihan status berasal dari master data dinamis. Status akan diperbarui saat verifikator memeriksa tindak lanjut OPD.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-ink">
                    Nilai Rekomendasi / Pengembalian Kas (Opsional)
                  </label>
                  {previewFormatted && (
                    <span className="text-2xs font-bold text-brand">
                      {previewFormatted}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Contoh: 25000000 (Kosongkan bila bukan rekomendasi setoran kas)"
                  value={nilaiRekomendasiInput}
                  onChange={(e) => setNilaiRekomendasiInput(e.target.value)}
                  className="form-input mt-1.5 text-xs font-mono"
                />
                <p className="mt-1 text-2xs text-muted">
                  Bersifat opsional. Digunakan jika rekomendasi mewajibkan penyetoran ganti rugi ke Kas Daerah.
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
                  <span>{isEditing ? "Simpan Perubahan" : "Tambah Rekomendasi"}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
