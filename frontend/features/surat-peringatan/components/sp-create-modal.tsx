"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  X,
} from "lucide-react";
import type { SpEligibilityResult, SpLevel } from "../types";
import { useCreateSuratPeringatan } from "../hooks/use-surat-peringatan";
import { formatRupiah, formatTanggalIndo } from "@/features/dashboard/utils/formatters";
import { getApiErrorMessage } from "@/lib/api-client";

type SpCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  lhp: SpEligibilityResult | null;
};

type FormContentProps = {
  lhp: SpEligibilityResult;
  onClose: () => void;
};

function SpCreateFormContent({ lhp, onClose }: FormContentProps) {
  const currentYear = new Date().getFullYear();
  const defaultCode = lhp.eligible_level || "SP1";
  const defaultToday = new Date().toISOString().split("T")[0];

  const [level, setLevel] = useState<SpLevel>(defaultCode);
  const [nomorSurat, setNomorSurat] = useState(`700/${defaultCode}/ITDA/${currentYear}`);
  const [tanggalSurat, setTanggalSurat] = useState(defaultToday);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateSuratPeringatan();

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!nomorSurat.trim()) {
      nextErrors.nomorSurat = "Nomor surat wajib diisi";
    }
    if (!tanggalSurat) {
      nextErrors.tanggalSurat = "Tanggal surat wajib diisi";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    try {
      await createMutation.mutateAsync({
        lhp_id: lhp.lhp_id,
        level,
        nomor_surat: nomorSurat.trim(),
        tanggal_surat: tanggalSurat,
      });

      toast.success(
        `Draft Surat Peringatan (${level}) untuk ${lhp.nomor_lhp} berhasil dibuat.`,
      );
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="overflow-y-auto p-5 sm:p-6 space-y-5 flex-1 min-h-0">
        {/* Info Sasaran LHP & OPD */}
      <div className="rounded-2xl border border-line bg-canvas/30 p-4 space-y-2 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2">
          <span className="font-bold text-ink">{lhp.nomor_lhp}</span>
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-2xs font-bold text-amber-800 border border-amber-200">
            Umur: {lhp.age_days} Hari
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-2xs text-muted">
          <div>
            <span className="block font-medium">Perangkat Daerah:</span>
            <span className="font-bold text-ink">{lhp.unit_kerja_nama || "Perangkat Daerah"}</span>
          </div>
          <div>
            <span className="block font-medium">Tgl Diterima LHP:</span>
            <span className="font-bold text-ink">{formatTanggalIndo(lhp.tanggal_diterima_lhp)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Level SP */}
        <div className="space-y-1.5">
          <label htmlFor="sp-level-select" className="label text-xs">
            Tingkat Surat Peringatan <span className="text-rose-500">*</span>
          </label>
          <select
            id="sp-level-select"
            value={level}
            onChange={(e) => setLevel(e.target.value as SpLevel)}
            className="input text-xs"
          >
            <option value="SP1">SP1 (Peringatan Pertama)</option>
            <option value="SP2">SP2 (Peringatan Kedua)</option>
            <option value="SP3">SP3 (Peringatan Ketiga)</option>
          </select>
        </div>

        {/* Tanggal Surat */}
        <div className="space-y-1.5">
          <label htmlFor="tanggal-surat-input" className="label text-xs">
            Tanggal Surat <span className="text-rose-500">*</span>
          </label>
          <input
            id="tanggal-surat-input"
            type="date"
            value={tanggalSurat}
            onChange={(e) => {
              setTanggalSurat(e.target.value);
              if (errors.tanggalSurat) {
                setErrors((prev) => ({ ...prev, tanggalSurat: "" }));
              }
            }}
            className={`input text-xs ${errors.tanggalSurat ? "border-rose-500" : ""}`}
          />
          {errors.tanggalSurat && (
            <p className="text-2xs text-rose-600 font-medium">{errors.tanggalSurat}</p>
          )}
        </div>
      </div>

      {/* Nomor Surat */}
      <div className="space-y-1.5">
        <label htmlFor="nomor-surat-input" className="label text-xs">
          Nomor Surat Peringatan <span className="text-rose-500">*</span>
        </label>
        <input
          id="nomor-surat-input"
          type="text"
          value={nomorSurat}
          onChange={(e) => {
            setNomorSurat(e.target.value);
            if (errors.nomorSurat) {
              setErrors((prev) => ({ ...prev, nomorSurat: "" }));
            }
          }}
          placeholder="Contoh: 700/01-SP1/ITDA/2026"
          className={`input text-xs ${errors.nomorSurat ? "border-rose-500" : ""}`}
        />
        {errors.nomorSurat && (
          <p className="text-2xs text-rose-600 font-medium">{errors.nomorSurat}</p>
        )}
      </div>

      {/* Snapshot Rekomendasi Tertunggak yang akan dikunci dalam SP */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <label className="label text-xs flex items-center gap-1.5">
            <AlertTriangle size={13} className="text-amber-600" />
            <span>Rekomendasi Tertunggak yang Dicantumkan ({lhp.outstanding_rekomendasis.length})</span>
          </label>
          <span className="text-[10px] text-muted">Akan di-snapshot ke dokumen PDF</span>
        </div>

        <div className="max-h-48 overflow-y-auto rounded-xl border border-line divide-y divide-line/60 bg-canvas/20">
          {lhp.outstanding_rekomendasis.map((rek, idx) => (
            <div key={rek.id} className="p-3 text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-ink">
                  #{idx + 1}. Rekomendasi urut {rek.nomor_urut}
                </span>
                {rek.nilai_rekomendasi && (
                  <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-2xs font-bold text-emerald-800 border border-emerald-200">
                    {formatRupiah(rek.nilai_rekomendasi)}
                  </span>
                )}
              </div>
              <p className="text-2xs text-muted leading-relaxed line-clamp-2">
                {rek.uraian}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Note Info */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-2xs text-blue-900 flex items-start gap-2">
        <Info size={14} className="shrink-0 text-blue-600 mt-0.5" />
        <span>
          Dokumen draft akan digenerate otomatis menggunakan template SP aktif. Anda dapat meninjau (preview) draft PDF sebelum melakukan tanda tangan digital (TTE).
        </span>
      </div>

      </div>

      {/* Footer Actions */}
      <div className="shrink-0 flex items-center justify-end gap-2.5 p-4 sm:p-5 border-t border-line bg-surface">
        <button
          type="button"
          onClick={onClose}
          disabled={createMutation.isPending}
          className="button-secondary text-xs"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="button-primary text-xs flex items-center gap-1.5 shadow-xs"
        >
          {createMutation.isPending ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Membuat Draft...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={13} />
              <span>Buat Draft Surat</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export function SpCreateModal({ isOpen, onClose, lhp }: SpCreateModalProps) {
  if (!isOpen || !lhp) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="flex min-h-full items-start sm:items-center justify-center py-4 sm:py-8">
        <div className="relative flex max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col rounded-3xl border border-line bg-surface shadow-modal overflow-hidden my-auto">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between border-b border-line px-5 py-4 bg-canvas/40">
            <div className="space-y-0.5">
              <span className="eyebrow">Penerbitan Surat Peringatan</span>
              <h3 className="text-base font-bold text-ink sm:text-lg">
                Buat Draft Surat Peringatan
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-muted hover:bg-canvas hover:text-ink transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Dynamic Form Content */}
          <SpCreateFormContent key={lhp.lhp_id} lhp={lhp} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
