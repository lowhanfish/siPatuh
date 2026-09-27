"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Loader2,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import type {
  JenisPenugasan,
  PejabatUnitKerja,
  SimpegUnitKerjaItem,
} from "@/features/unit-kerja/types";
import {
  useCreatePejabat,
  useUpdatePejabat,
} from "@/features/unit-kerja/hooks/use-pejabat";
import { getApiErrorMessage } from "@/lib/api-client";

type PejabatModalProps = {
  pejabat: PejabatUnitKerja | null;
  defaultUnitKerjaId?: string;
  isOpen: boolean;
  onClose: () => void;
  units: SimpegUnitKerjaItem[];
};

export function PejabatModal({
  pejabat,
  defaultUnitKerjaId,
  isOpen,
  onClose,
  units,
}: PejabatModalProps) {
  if (!isOpen) return null;
  return (
    <PejabatModalContent
      pejabat={pejabat}
      defaultUnitKerjaId={defaultUnitKerjaId}
      onClose={onClose}
      units={units}
    />
  );
}

function PejabatModalContent({
  pejabat,
  defaultUnitKerjaId,
  onClose,
  units,
}: {
  pejabat: PejabatUnitKerja | null;
  defaultUnitKerjaId?: string;
  onClose: () => void;
  units: SimpegUnitKerjaItem[];
}) {
  const isEditing = !!pejabat;

  const [simpegUnitKerjaId, setSimpegUnitKerjaId] = useState(
    pejabat?.simpeg_unit_kerja_id || defaultUnitKerjaId || (units.length > 0 ? units[0].id : ""),
  );
  const [nip, setNip] = useState(pejabat?.nip || "");
  const [nama, setNama] = useState(pejabat?.nama || "");
  const [jabatan, setJabatan] = useState(pejabat?.jabatan || "");
  const [jenisPenugasan, setJenisPenugasan] = useState<JenisPenugasan>(
    pejabat?.jenis_penugasan || "DEFINITIF",
  );
  const [tanggalMulai, setTanggalMulai] = useState(
    pejabat?.tanggal_mulai ? pejabat.tanggal_mulai.substring(0, 10) : "",
  );
  const [tanggalSelesai, setTanggalSelesai] = useState(
    pejabat?.tanggal_selesai ? pejabat.tanggal_selesai.substring(0, 10) : "",
  );
  const [isActive, setIsActive] = useState(pejabat ? pejabat.is_active : true);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreatePejabat();
  const updateMutation = useUpdatePejabat();
  const isPending = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!simpegUnitKerjaId) {
      setFormError("Unit Kerja wajib dipilih.");
      return;
    }
    if (!nip.trim()) {
      setFormError("NIP pejabat wajib diisi.");
      return;
    }
    if (!nama.trim()) {
      setFormError("Nama pejabat wajib diisi.");
      return;
    }
    if (!jabatan.trim()) {
      setFormError("Jabatan pejabat wajib diisi.");
      return;
    }
    if (!tanggalMulai) {
      setFormError("Tanggal mulai penugasan wajib diisi.");
      return;
    }

    if (tanggalSelesai && new Date(tanggalSelesai) < new Date(tanggalMulai)) {
      setFormError("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    try {
      setFormError(null);
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: pejabat.id,
          input: {
            simpeg_unit_kerja_id: simpegUnitKerjaId,
            nip: nip.trim(),
            nama: nama.trim(),
            jabatan: jabatan.trim(),
            jenis_penugasan: jenisPenugasan,
            tanggal_mulai: tanggalMulai,
            tanggal_selesai: tanggalSelesai || null,
            is_active: isActive,
          },
        });
        toast.success(`Data pejabat ${nama.trim()} berhasil diperbarui.`);
      } else {
        await createMutation.mutateAsync({
          simpeg_unit_kerja_id: simpegUnitKerjaId,
          nip: nip.trim(),
          nama: nama.trim(),
          jabatan: jabatan.trim(),
          jenis_penugasan: jenisPenugasan,
          tanggal_mulai: tanggalMulai,
          tanggal_selesai: tanggalSelesai || null,
          is_active: isActive,
        });
        toast.success(`Pejabat ${nama.trim()} berhasil ditambahkan.`);
      }
      onClose();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pejabat-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs"
    >
      <div className="w-full max-w-xl rounded-3xl border border-line bg-surface p-6 shadow-panel sm:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand">
              {isEditing ? <UserCheck size={20} /> : <UserPlus size={20} />}
            </span>
            <div>
              <h2 id="pejabat-modal-title" className="text-lg font-bold text-ink sm:text-xl">
                {isEditing ? "Ubah Data Pejabat Unit Kerja" : "Tambah Pejabat Unit Kerja"}
              </h2>
              <p className="text-xs text-muted">
                Dikelola manual di SIPATUH sebagai penerima resmi surat peringatan Inspektorat
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Unit Kerja Selection */}
          <div className="space-y-1.5">
            <label htmlFor="pejabat-unit-kerja" className="form-label text-xs">
              Organisasi / Unit Kerja (SIMPEG) *
            </label>
            <div className="relative">
              <Building2
                aria-hidden
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                size={16}
              />
              <select
                id="pejabat-unit-kerja"
                value={simpegUnitKerjaId}
                onChange={(e) => setSimpegUnitKerjaId(e.target.value)}
                className="form-input pl-10 text-xs sm:text-sm cursor-pointer"
                required
              >
                <option value="">-- Pilih Unit Kerja --</option>
                {units.map((u, idx) => (
                  <option key={u.id || `unit-${idx}`} value={u.id}>
                    {u.unit_kerja}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Nama & NIP */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="pejabat-nama" className="form-label text-xs">
                Nama Lengkap & Gelar *
              </label>
              <input
                id="pejabat-nama"
                type="text"
                placeholder="mis. Dr. Ir. H. Ahmad, M.Si"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="form-input text-xs sm:text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pejabat-nip" className="form-label text-xs">
                NIP Pegawai *
              </label>
              <input
                id="pejabat-nip"
                type="text"
                placeholder="19xxxxxxxxxxxxxx"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                className="form-input text-xs sm:text-sm"
                required
              />
            </div>
          </div>

          {/* Jabatan & Jenis Penugasan */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="pejabat-jabatan" className="form-label text-xs">
                Jabatan Struktural *
              </label>
              <input
                id="pejabat-jabatan"
                type="text"
                placeholder="mis. Kepala Dinas Pendidikan"
                value={jabatan}
                onChange={(e) => setJabatan(e.target.value)}
                className="form-input text-xs sm:text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pejabat-jenis" className="form-label text-xs">
                Jenis Penugasan *
              </label>
              <select
                id="pejabat-jenis"
                value={jenisPenugasan}
                onChange={(e) => setJenisPenugasan(e.target.value as JenisPenugasan)}
                className="form-input text-xs sm:text-sm cursor-pointer"
              >
                <option value="DEFINITIF">DEFINITIF (Pejabat Tetap)</option>
                <option value="PLT">PLT (Pelaksana Tugas)</option>
                <option value="PLH">PLH (Pelaksana Harian)</option>
              </select>
            </div>
          </div>

          {/* Periode Penugasan */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="pejabat-mulai" className="form-label text-xs">
                Tanggal Mulai Menjabat *
              </label>
              <div className="relative">
                <Calendar
                  aria-hidden
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                  size={16}
                />
                <input
                  id="pejabat-mulai"
                  type="date"
                  value={tanggalMulai}
                  onChange={(e) => setTanggalMulai(e.target.value)}
                  className="form-input pl-10 text-xs sm:text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pejabat-selesai" className="form-label text-xs">
                Tanggal Selesai (Opsional)
              </label>
              <div className="relative">
                <Calendar
                  aria-hidden
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                  size={16}
                />
                <input
                  id="pejabat-selesai"
                  type="date"
                  value={tanggalSelesai}
                  onChange={(e) => setTanggalSelesai(e.target.value)}
                  className="form-input pl-10 text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Status Aktif */}
          <div className="flex items-center gap-2 pt-1">
            <input
              id="pejabat-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded text-brand focus:ring-brand cursor-pointer"
            />
            <label htmlFor="pejabat-active" className="text-xs font-semibold text-ink cursor-pointer">
              Pejabat Aktif (Kandidat penerima surat saat ini)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-line/60 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-semibold text-muted hover:text-ink transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="button-primary text-xs sm:text-sm flex items-center gap-1.5"
            >
              {isPending ? (
                <>
                  <Loader2 aria-hidden className="animate-spin" size={14} />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{isEditing ? "Simpan Perubahan" : "Simpan Pejabat"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
