"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { toast } from "sonner";

import {
  AlertCircle,
  Calendar,
  Clock,
  FileText,
  FileUp,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";

import type { SimpegUnitKerjaItem } from "@/features/unit-kerja/types";
import type { JenisPemeriksaan } from "@/features/master-data/types";
import type { AuthUser } from "@/features/auth/types";
import { UnitKerjaCombobox } from "@/features/unit-kerja/components/unit-kerja-combobox";

import { useCreateLhp } from "../hooks/use-lhp";
import { getApiErrorMessage } from "@/lib/api-client";

type LhpCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  units: SimpegUnitKerjaItem[];
  jenisList: JenisPemeriksaan[];
  currentUser: AuthUser | null;
  onSuccess?: () => void;
};

export function LhpCreateModal({
  isOpen,
  onClose,
  units,
  jenisList,
  currentUser,
  onSuccess,
}: LhpCreateModalProps) {
  if (!isOpen) return null;

  return (
    <LhpCreateModalContent
      onClose={onClose}
      units={units}
      jenisList={jenisList}
      currentUser={currentUser}
      onSuccess={onSuccess}
    />
  );
}

function LhpCreateModalContent({
  onClose,
  units,
  jenisList,
  currentUser,
  onSuccess,
}: {
  onClose: () => void;
  units: SimpegUnitKerjaItem[];
  jenisList: JenisPemeriksaan[];
  currentUser: AuthUser | null;
  onSuccess?: () => void;
}) {
  // Filter Unit Kerja:
  // - Admin Irban HANYA boleh memilih unit kerja yang terpetakan ke wilayah Irban miliknya
  // - Super Admin boleh memilih seluruh unit kerja yang sudah terpetakan ke Irban manapun
  const eligibleUnits = useMemo(() => {
    if (currentUser?.role === "ADMIN_IRBAN") {
      return units.filter(
        (u) => u.is_assigned && u.assigned_irban?.id === currentUser.irban_id,
      );
    }
    return units.filter((u) => u.is_assigned);
  }, [units, currentUser]);

  const activeJenisList = useMemo(() => {
    return jenisList.filter((j) => j.is_active);
  }, [jenisList]);

  // Form states
  const todayIso = new Date().toISOString().substring(0, 10);
  const [nomorLhp, setNomorLhp] = useState("");
  const [simpegUnitKerjaId, setSimpegUnitKerjaId] = useState("");
  const [jenisPemeriksaanId, setJenisPemeriksaanId] = useState(
    activeJenisList.length > 0 ? activeJenisList[0].id : "",
  );

  const [tanggalLhp, setTanggalLhp] = useState(todayIso);
  const [tanggalDiterimaLhp, setTanggalDiterimaLhp] = useState(todayIso);
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateLhp();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setFormError("Hanya berkas format PDF yang diperbolehkan.");
      setSelectedFile(null);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setFormError("Ukuran berkas PDF melebihi batas maksimum 20 MB.");
      setSelectedFile(null);
      return;
    }

    setFormError(null);
    setSelectedFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nomorLhp.trim()) {
      setFormError("Nomor LHP wajib diisi.");
      return;
    }
    if (!simpegUnitKerjaId) {
      setFormError("Unit Kerja / OPD sasaran pemeriksaan wajib dipilih.");
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
      setFormError("Tanggal dokumen diterima OPD wajib diisi (dasar peringatan SP).");
      return;
    }

    try {
      setFormError(null);

      const formData = new FormData();
      formData.append("nomor_lhp", nomorLhp.trim());
      formData.append("simpeg_unit_kerja_id", simpegUnitKerjaId);
      formData.append("jenis_pemeriksaan_id", jenisPemeriksaanId);
      formData.append("tanggal_lhp", tanggalLhp);
      formData.append("tanggal_diterima_lhp", tanggalDiterimaLhp);

      if (tanggalMulai) {
        formData.append("tanggal_mulai_pemeriksaan", tanggalMulai);
      }
      if (tanggalSelesai) {
        formData.append("tanggal_selesai_pemeriksaan", tanggalSelesai);
      }
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      await createMutation.mutateAsync(formData);
      toast.success(`LHP nomor ${nomorLhp} berhasil dibuat.`);
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
      aria-labelledby="lhp-create-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-2xl my-8 rounded-3xl border border-line bg-surface p-6 shadow-panel sm:p-8">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand">
              <FileText aria-hidden size={20} />
            </span>
            <div>
              <h2 id="lhp-create-title" className="text-lg font-bold text-ink sm:text-xl">
                Tambah Laporan Hasil Pemeriksaan (LHP)
              </h2>
              <p className="text-xs text-muted">
                Pencatatan dokumen LHP baru dalam sistem pemantauan pengawasan Inspektorat
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

        {/* Form Error Banner */}
        {formError && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
            <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="space-y-1">
              <p className="font-bold">Gagal Menyimpan LHP</p>
              <p className="text-rose-700">{formError}</p>
            </div>
          </div>
        )}

        {/* Warning jika tidak ada Unit Kerja valid (hanya untuk Admin Irban yang belum memiliki pemetaan) */}
        {currentUser?.role !== "SUPER_ADMIN" && eligibleUnits.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">

            <ShieldAlert className="mx-auto size-8 text-amber-600" />
            <h4 className="mt-2 text-sm font-bold text-amber-900">
              Tidak Ada Unit Kerja yang Tersedia
            </h4>
            <p className="mt-1 text-xs text-amber-800 leading-relaxed max-w-md mx-auto">
              {currentUser?.role === "ADMIN_IRBAN"
                ? "Belum ada Unit Kerja SIMPEG yang dipetakan ke wilayah Irban Anda. Hubungi Super Admin untuk melakukan pemetaan OPD di menu Administrasi Wilayah."
                : "Belum ada Unit Kerja SIMPEG yang dipetakan ke Irban. Silakan lakukan pemetaan di menu Unit Kerja & Pejabat terlebih dahulu."}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-amber-300 bg-surface px-4 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                Tutup
              </button>
              {currentUser?.role === "SUPER_ADMIN" && (
                <Link
                  href="/unit-kerja"
                  onClick={onClose}
                  className="rounded-xl bg-brand text-white px-4 py-2 text-xs font-bold hover:bg-brand/90 transition-colors shadow-xs"
                >
                  Buka Menu Pemetaan OPD
                </Link>
              )}
            </div>

          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Nomor LHP */}
            <div>
              <label className="block text-xs font-bold text-ink">
                Nomor Dokumen LHP <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: 700/01/INSP/2026"
                value={nomorLhp}
                onChange={(e) => setNomorLhp(e.target.value)}
                className="form-input mt-1.5 text-xs sm:text-sm font-semibold"
                required
              />
              <p className="mt-1 text-2xs text-muted">
                Nomor surat resmi LHP dari naskah dinas fisik, harus unik.
              </p>
            </div>

            {/* Pilihan Unit Kerja SIMPEG (Autocomplete) */}
            <div>
              <label className="block text-xs font-bold text-ink">
                Unit Kerja / OPD Sasaran Pemeriksaan <span className="text-rose-500">*</span>
              </label>
              <div className="mt-1.5">
                <UnitKerjaCombobox
                  value={simpegUnitKerjaId}
                  onChange={(id) => setSimpegUnitKerjaId(id)}
                  requiredRoleIrbanId={currentUser?.irban_id}
                  isSuperAdmin={currentUser?.role === "SUPER_ADMIN"}
                />
              </div>
              <p className="mt-1 text-2xs text-muted">
                Pencarian autocomplete mencakup seluruh dinas, badan, kecamatan, sekolah, dan puskesmas di Konawe Selatan.
              </p>
            </div>


            {/* Pilihan Jenis Pemeriksaan */}
            <div>
              <label className="block text-xs font-bold text-ink">
                Jenis Pemeriksaan / Pengawasan <span className="text-rose-500">*</span>
              </label>
              <select
                value={jenisPemeriksaanId}
                onChange={(e) => setJenisPemeriksaanId(e.target.value)}
                className="form-input mt-1.5 text-xs sm:text-sm font-semibold cursor-pointer"
                required
              >
                {activeJenisList.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Dua Tanggal Krusial: Tanggal LHP vs Tanggal Diterima LHP */}
            <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-line/80 bg-canvas/40 p-4">
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
                <p className="mt-1 text-2xs text-muted leading-tight">
                  Tanggal dokumen LHP resmi ditandatangani oleh Inspektur.
                </p>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <Clock size={13} className="text-emerald-600" />
                  <span>Tanggal Dokumen Diterima OPD</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={tanggalDiterimaLhp}
                  onChange={(e) => setTanggalDiterimaLhp(e.target.value)}
                  className="form-input mt-1 text-xs font-semibold border-emerald-300 focus:border-emerald-500"
                  required
                />
                <p className="mt-1 text-2xs text-emerald-700 leading-tight">
                  Dasar perhitungan countdown batas 60 hari kalender tindak lanjut dan peringatan SP1/SP2/SP3.
                </p>
              </div>
            </div>

            {/* Periode Pemeriksaan di Lapangan (Opsional) */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-muted">
                  Tanggal Mulai Pemeriksaan (Opsional)
                </label>
                <input
                  type="date"
                  value={tanggalMulai}
                  onChange={(e) => setTanggalMulai(e.target.value)}
                  className="form-input mt-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted">
                  Tanggal Selesai Pemeriksaan (Opsional)
                </label>
                <input
                  type="date"
                  value={tanggalSelesai}
                  onChange={(e) => setTanggalSelesai(e.target.value)}
                  className="form-input mt-1.5 text-xs"
                />
              </div>
            </div>

            {/* Unggah Berkas PDF LHP (Opsional saat pembuatan) */}
            <div className="rounded-2xl border border-dashed border-line bg-surface p-4">
              <label className="flex items-center gap-2 text-xs font-bold text-ink">
                <FileUp size={15} className="text-brand" />
                <span>Unggah Berkas Fisik LHP (PDF)</span>
              </label>
              <p className="mt-0.5 text-2xs text-muted">
                Maksimal ukuran berkas 20 MB. Dapat diunggah sekarang atau menyusul kemudian.
              </p>

              <div className="mt-3 flex items-center gap-3">
                <input
                  type="file"
                  id="lhp-file-upload"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="text-xs text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-soft file:text-brand hover:file:bg-brand/15 cursor-pointer"
                />
                {selectedFile && (
                  <span className="text-2xs font-semibold text-emerald-700">
                    ✓ {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                )}
              </div>
            </div>

            {/* Tombol Aksi Form */}
            <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-semibold text-muted hover:text-ink transition-colors cursor-pointer"
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
                    <span>Menyimpan LHP...</span>
                  </>
                ) : (
                  <span>Simpan Dokumen LHP</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
