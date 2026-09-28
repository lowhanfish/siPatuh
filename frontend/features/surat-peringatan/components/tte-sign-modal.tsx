"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Download,
  KeyRound,
  Loader2,
  Lock,
  PenTool,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import type { SuratPeringatanItem } from "../types";
import { useSignTteSuratPeringatan } from "../hooks/use-surat-peringatan";
import { downloadSignedPdf } from "../api/surat-peringatan-api";
import { getApiErrorMessage } from "@/lib/api-client";

type TteSignModalProps = {
  isOpen: boolean;
  onClose: () => void;
  surat: SuratPeringatanItem | null;
};

export function TteSignModal({ isOpen, onClose, surat }: TteSignModalProps) {
  const [nik, setNik] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signedSuccess, setSignedSuccess] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const signMutation = useSignTteSuratPeringatan(surat?.id || "");

  if (!isOpen || !surat) return null;

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!nik.trim()) {
      nextErrors.nik = "NIK penandatangan TTE wajib diisi";
    }
    if (!passphrase) {
      nextErrors.passphrase = "Passphrase TTE wajib diisi";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSign(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !surat) return;

    try {
      await signMutation.mutateAsync({
        nik: nik.trim(),
        passphrase, // strictly in-memory during submission
      });

      // Clear passphrase immediately from memory
      setPassphrase("");
      setSignedSuccess(true);
      toast.success(
        `Surat Peringatan ${surat.nomor_surat} berhasil ditandatangani secara elektronik (TTE).`,
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleDownloadSigned() {
    if (!surat) return;
    try {
      setIsDownloading(true);
      const filename = `${surat.level}_${surat.nomor_surat.replace(/[\/\\]/g, "_")}_Signed.pdf`;
      await downloadSignedPdf(surat.id, filename);
      toast.success("Signed PDF berhasil diunduh.");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setIsDownloading(false);
    }
  }

  function handleCloseModal() {
    setNik("");
    setPassphrase("");
    setSignedSuccess(false);
    setErrors({});
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="flex min-h-full items-start sm:items-center justify-center py-4 sm:py-8">
        <div className="relative flex max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] w-full max-w-lg flex-col rounded-3xl border border-line bg-surface shadow-modal overflow-hidden my-auto">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between border-b border-line px-5 py-4 bg-canvas/40">
            <div className="space-y-0.5">
              <span className="eyebrow">Tanda Tangan Elektronik (TTE)</span>
              <h3 className="text-base font-bold text-ink sm:text-lg">
                Penandatanganan Digital BSrE
              </h3>
            </div>
            <button
              type="button"
              onClick={handleCloseModal}
              className="rounded-full p-2 text-muted hover:bg-canvas hover:text-ink transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 min-h-0">
          {signedSuccess ? (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <ShieldCheck size={32} />
              </div>

              <div>
                <h4 className="text-base font-bold text-ink">
                  Dokumen Berhasil Ditandatangani!
                </h4>
                <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
                  Surat Peringatan <span className="font-bold text-ink">{surat.nomor_surat}</span> telah memiliki sertifikat digital BSrE yang sah dan berstatus resmi (immutable).
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadSigned}
                  disabled={isDownloading}
                  className="button-primary text-xs w-full sm:w-auto inline-flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {isDownloading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Download size={13} />
                  )}
                  <span>Download Signed PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="button-secondary text-xs w-full sm:w-auto"
                >
                  Tutup
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSign} className="space-y-4">
              {/* Surat Target Info */}
              <div className="rounded-2xl border border-line bg-canvas/30 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-line/60 pb-2">
                  <span className="font-bold text-ink">{surat.nomor_surat}</span>
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-2xs font-bold text-blue-700 border border-blue-200">
                    {surat.level}
                  </span>
                </div>
                <div className="text-2xs text-muted">
                  <span className="block font-medium">OPD Tujuan:</span>
                  <span className="font-bold text-ink">{surat.unit_kerja_nama}</span>
                </div>
              </div>

              {/* Warning Immutability */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 text-2xs text-amber-900 flex items-start gap-2.5">
                <ShieldAlert size={16} className="shrink-0 text-amber-700 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Perhatian Hukum & Integritas Dokumen</p>
                  <p className="leading-relaxed">
                    Dokumen yang telah ditandatangani secara elektronik bersifat permanen (immutable) dan tidak dapat diubah atau dihapus kembali.
                  </p>
                </div>
              </div>

              {/* Form Input NIK */}
              <div className="space-y-1.5">
                <label htmlFor="tte-nik-input" className="label text-xs flex items-center gap-1.5">
                  <UserCheck size={13} className="text-muted" />
                  <span>NIK Penandatangan <span className="text-rose-500">*</span></span>
                </label>
                <input
                  id="tte-nik-input"
                  type="text"
                  maxLength={16}
                  value={nik}
                  onChange={(e) => {
                    setNik(e.target.value);
                    if (errors.nik) setErrors((prev) => ({ ...prev, nik: "" }));
                  }}
                  placeholder="Masukkan 16 digit NIK pejabat penandatangan"
                  className={`input text-xs font-mono ${errors.nik ? "border-rose-500" : ""}`}
                />
                {errors.nik && (
                  <p className="text-2xs text-rose-600 font-medium">{errors.nik}</p>
                )}
              </div>

              {/* Form Input Passphrase */}
              <div className="space-y-1.5">
                <label htmlFor="tte-passphrase-input" className="label text-xs flex items-center gap-1.5">
                  <KeyRound size={13} className="text-muted" />
                  <span>Passphrase TTE BSrE <span className="text-rose-500">*</span></span>
                </label>
                <input
                  id="tte-passphrase-input"
                  type="password"
                  autoComplete="new-password"
                  value={passphrase}
                  onChange={(e) => {
                    setPassphrase(e.target.value);
                    if (errors.passphrase) setErrors((prev) => ({ ...prev, passphrase: "" }));
                  }}
                  placeholder="Masukkan passphrase sertifikat elektronik Anda"
                  className={`input text-xs ${errors.passphrase ? "border-rose-500" : ""}`}
                />
                {errors.passphrase && (
                  <p className="text-2xs text-rose-600 font-medium">{errors.passphrase}</p>
                )}
                <p className="text-[10px] text-muted flex items-center gap-1">
                  <Lock size={10} />
                  <span>Passphrase tidak disimpan di sistem atau browser Anda.</span>
                </p>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={signMutation.isPending}
                  className="button-secondary text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={signMutation.isPending}
                  className="rounded-xl bg-emerald-600 text-surface hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {signMutation.isPending ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Menandatangani Dokumen...</span>
                    </>
                  ) : (
                    <>
                      <PenTool size={13} />
                      <span>Tandatangani Secara Elektronik</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  </div>
);
}
