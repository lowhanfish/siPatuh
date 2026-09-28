"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Calendar,
  Clock,
  Edit2,
  Loader2,
  X,
} from "lucide-react";
import type { LhpListItem } from "../types";
import type { JenisPemeriksaan } from "@/features/master-data/types";
import { useUpdateLhp } from "../hooks/use-lhp";
import { getApiErrorMessage } from "@/lib/api-client";

type LhpEditModalProps = {
  lhp: LhpListItem | null;
  isOpen: boolean;
  onClose: () => void;
  jenisList: JenisPemeriksaan[];
  onSuccess?: () => void;
};

export function LhpEditModal({
  lhp,
  isOpen,
  onClose,
  jenisList,
  onSuccess,
}: LhpEditModalProps) {
  if (!isOpen || !lhp) return null;

  return (
    <LhpEditModalContent
      lhp={lhp}
      onClose={onClose}
      jenisList={jenisList}
      onSuccess={onSuccess}
    />
  );
}

function LhpEditModalContent({
  lhp,
  onClose,
  jenisList,
  onSuccess,
}: {
  lhp: LhpListItem;
  onClose: () => void;
  jenisList: JenisPemeriksaan[];
  onSuccess?: () => void;
}) {
  const activeJenisList = useMemo(() => {
    return jenisList.filter((j) => j.is_active || j.id === lhp.jenis_pemeriksaan_id);
  }, [jenisList, lhp.jenis_pemeriksaan_id]);

  const [nomorLhp, setNomorLhp] = useState(lhp.nomor_lhp);
  const [jenisPemeriksaanId, setJenisPemeriksaanId] = useState(lhp.jenis_pemeriksaan_id);
  const [tanggalLhp, setTanggalLhp] = useState(lhp.tanggal_lhp.substring(0, 10));
  const [tanggalDiterimaLhp, setTanggalDiterimaLhp] = useState(
    lhp.tanggal_diterima_lhp.substring(0, 10),
  );
  const [tanggalMulai, setTanggalMulai] = useState(
    lhp.tanggal_mulai_pemeriksaan ? lhp.tanggal_mulai_pemeriksaan.substring(0, 10) : "",
  );
  const [tanggalSelesai, setTanggalSelesai] = useState(
    lhp.tanggal_selesai_pemeriksaan ? lhp.tanggal_selesai_pemeriksaan.substring(0, 10) : "",
  );

  const [formError, setFormError] = useState<string | null>(null);

  const updateMutation = useUpdateLhp();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nomorLhp.trim()) {
      setFormError("Nomor LHP wajib diisi.");
      return;
    }
    if (!jenisPemeriksaanId) {
      setFormError("Jenis Pemeriksaan wajib dipilih.");
      return;
    }
    if (!tanggalLhp) {
      setFormError("Tanggal penerbitan LHP wajib diisi.");
      return;
    }
    if (!tanggalDiterimaLhp) {
      setFormError("Tanggal dokumen diterima OPD wajib diisi.");
      return;
    }

    try {
      setFormError(null);

      await updateMutation.mutateAsync({
        id: lhp.id,
        input: {
          nomor_lhp: nomorLhp.trim(),
          jenis_pemeriksaan_id: jenisPemeriksaanId,
          tanggal_lhp: tanggalLhp,
          tanggal_diterima_lhp: tanggalDiterimaLhp,
          tanggal_mulai_pemeriksaan: tanggalMulai || null,
          tanggal_selesai_pemeriksaan: tanggalSelesai || null,
        },
      });

      toast.success(`Data LHP ${nomorLhp} berhasil diperbarui.`);
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
      aria-labelledby="lhp-edit-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-xl my-8 rounded-3xl border border-line bg-surface p-6 shadow-panel sm:p-8">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Edit2 aria-hidden size={18} />
            </span>
            <div>
              <h2 id="lhp-edit-title" className="text-lg font-bold text-ink sm:text-xl">
                Ubah Metadata LHP
              </h2>
              <p className="text-xs text-muted">
                {lhp.unit_kerja_nama} • {lhp.irban.nama}
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

        {/* Error Banner */}
        {formError && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
            <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="space-y-1">
              <p className="font-bold">Gagal Memperbarui LHP</p>
              <p className="text-rose-700">{formError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Nomor LHP */}
          <div>
            <label className="block text-xs font-bold text-ink">
              Nomor Dokumen LHP <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={nomorLhp}
              onChange={(e) => setNomorLhp(e.target.value)}
              className="form-input mt-1 text-xs sm:text-sm font-semibold"
              required
            />
          </div>

          {/* Jenis Pemeriksaan */}
          <div>
            <label className="block text-xs font-bold text-ink">
              Jenis Pemeriksaan <span className="text-rose-500">*</span>
            </label>
            <select
              value={jenisPemeriksaanId}
              onChange={(e) => setJenisPemeriksaanId(e.target.value)}
              className="form-input mt-1 text-xs sm:text-sm font-semibold cursor-pointer"
              required
            >
              {activeJenisList.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nama} {!j.is_active ? "(Nonaktif - Historis)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Dua Tanggal Krusial */}
          <div className="grid gap-3 sm:grid-cols-2 rounded-2xl border border-line bg-canvas/40 p-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-ink">
                <Calendar size={13} className="text-brand" />
                <span>Tanggal Terbit LHP</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={tanggalLhp}
                onChange={(e) => setTanggalLhp(e.target.value)}
                className="form-input mt-1 text-xs font-semibold"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <Clock size={13} className="text-emerald-600" />
                <span>Tanggal Diterima OPD</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={tanggalDiterimaLhp}
                onChange={(e) => setTanggalDiterimaLhp(e.target.value)}
                className="form-input mt-1 text-xs font-semibold border-emerald-300"
                required
              />
            </div>
          </div>

          {/* Periode Pemeriksaan di Lapangan */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-muted">
                Tanggal Mulai (Opsional)
              </label>
              <input
                type="date"
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
                className="form-input mt-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted">
                Tanggal Selesai (Opsional)
              </label>
              <input
                type="date"
                value={tanggalSelesai}
                onChange={(e) => setTanggalSelesai(e.target.value)}
                className="form-input mt-1 text-xs"
              />
            </div>
          </div>

          {/* Tombol Aksi */}
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
              disabled={updateMutation.isPending}
              className="button-primary text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 aria-hidden className="animate-spin" size={14} />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Perubahan</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
