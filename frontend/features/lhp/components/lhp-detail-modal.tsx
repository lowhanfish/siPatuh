"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  FileCheck,
  FileText,
  Loader2,
  Lock,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import type { LhpListItem } from "../types";
import type { AuthUser } from "@/features/auth/types";
import { useLhpDetail, useUploadLhpFile } from "../hooks/use-lhp";
import { downloadLhpFileRequest } from "../api/lhp-api";
import { formatTanggalIndo } from "@/features/dashboard/utils/formatters";
import { getApiErrorMessage } from "@/lib/api-client";
import { TemuanRekomendasiSection } from "@/features/temuan-rekomendasi/components/temuan-rekomendasi-section";

type LhpDetailModalProps = {
  lhpId: string | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onEdit: (lhp: LhpListItem) => void;
  onCloseLhp: (lhp: LhpListItem) => void;
  onReopenLhp: (lhp: LhpListItem) => void;
};

export function LhpDetailModal({
  lhpId,
  isOpen,
  onClose,
  currentUser,
  onEdit,
  onCloseLhp,
  onReopenLhp,
}: LhpDetailModalProps) {
  if (!isOpen || !lhpId) return null;

  return (
    <LhpDetailModalContent
      lhpId={lhpId}
      onClose={onClose}
      currentUser={currentUser}
      onEdit={onEdit}
      onCloseLhp={onCloseLhp}
      onReopenLhp={onReopenLhp}
    />
  );
}

function LhpDetailModalContent({
  lhpId,
  onClose,
  currentUser,
  onEdit,
  onCloseLhp,
  onReopenLhp,
}: {
  lhpId: string;
  onClose: () => void;
  currentUser: AuthUser | null;
  onEdit: (lhp: LhpListItem) => void;
  onCloseLhp: (lhp: LhpListItem) => void;
  onReopenLhp: (lhp: LhpListItem) => void;
}) {
  const { data: lhp, isLoading, error } = useLhpDetail(lhpId);
  const uploadMutation = useUploadLhpFile();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const canMutate =
    (currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ADMIN_IRBAN") &&
    !lhp?.is_closed;
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  async function handleDownloadFile() {
    if (!lhp || !lhp.file_path) return;
    try {
      setIsDownloading(true);
      await downloadLhpFileRequest(lhp.id, lhp.nomor_lhp);
      toast.success("Berkas PDF LHP berhasil diunduh.");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !lhp) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Hanya berkas format PDF yang diperbolehkan.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Ukuran berkas PDF melebihi batas maksimum 20 MB.");
      return;
    }

    try {
      await uploadMutation.mutateAsync({ id: lhp.id, file });
      toast.success("Berkas PDF LHP berhasil diunggah.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lhp-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-3xl my-8 rounded-3xl border border-line bg-surface p-6 shadow-panel sm:p-8 space-y-6">
        {/* Header Modal */}
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="eyebrow">Detail Pemeriksaan</span>
              {lhp && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-2xs font-bold ${
                    lhp.is_closed
                      ? "bg-slate-100 text-slate-700 border border-slate-300"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  {lhp.is_closed ? <Lock size={11} /> : <CheckCircle2 size={11} />}
                  {lhp.is_closed ? "Selesai (Closed)" : "Aktif (Dalam Pemantauan)"}
                </span>
              )}
            </div>
            <h2 id="lhp-detail-title" className="text-xl font-bold text-ink sm:text-2xl">
              {lhp ? lhp.nomor_lhp : "Memuat Dokumen LHP..."}
            </h2>
            {lhp && (
              <p className="text-xs text-muted flex items-center gap-1.5 font-medium">
                <Building2 size={13} className="text-muted" />
                <span>{lhp.unit_kerja_nama}</span>
                <span>•</span>
                <span>{lhp.irban.nama}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-surface p-2 text-muted hover:text-ink transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Loading & Error States */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="animate-spin text-brand" size={32} />
            <p className="mt-3 text-xs text-muted">Mengambil rincian LHP...</p>
          </div>
        ) : error || !lhp ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-xs text-rose-800">
            <AlertCircle className="mx-auto size-8 text-rose-600 mb-2" />
            <p className="font-bold text-sm">Gagal Mengambil Detail LHP</p>
            <p className="mt-1">{getApiErrorMessage(error)}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Banner State: Jika LHP Sudah Ditutup */}
            {lhp.is_closed && (
              <div className="flex items-start justify-between rounded-2xl border border-slate-300 bg-slate-50 p-4 text-xs text-slate-800">
                <div className="flex items-start gap-2.5">
                  <Lock className="size-4 shrink-0 mt-0.5 text-slate-600" />
                  <div>
                    <p className="font-bold">LHP Ini Telah Ditandai Selesai (Closed)</p>
                    <p className="mt-0.5 text-2xs text-muted">
                      Ditutup pada{" "}
                      <span className="font-semibold text-ink">
                        {lhp.closed_at ? formatTanggalIndo(lhp.closed_at) : "-"}
                      </span>
                      {lhp.closed_by_user && (
                        <span> oleh akun {lhp.closed_by_user.egov_user_id} ({lhp.closed_by_user.role})</span>
                      )}
                      . Pembaruan data terkunci.
                    </p>
                  </div>
                </div>

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onReopenLhp(lhp);
                    }}
                    className="button-primary bg-amber-600 hover:bg-amber-700 text-2xs py-1.5 px-3 font-bold text-white shadow-xs shrink-0 flex items-center gap-1"
                  >
                    <RotateCcw size={13} />
                    <span>Buka Kembali</span>
                  </button>
                )}
              </div>
            )}

            {/* Grid Informasi Utama */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-line bg-canvas/30 p-4">
                <span className="text-2xs font-semibold text-muted uppercase tracking-wider">
                  Jenis Pengawasan
                </span>
                <p className="mt-1 font-bold text-ink sm:text-sm">
                  {lhp.jenis_pemeriksaan.nama}
                </p>
              </div>

              <div className="rounded-2xl border border-line bg-canvas/30 p-4">
                <span className="text-2xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={11} className="text-brand" />
                  Tanggal Terbit Dokumen
                </span>
                <p className="mt-1 font-bold text-ink sm:text-sm">
                  {formatTanggalIndo(lhp.tanggal_lhp)}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <span className="text-2xs font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                  <Clock size={11} className="text-emerald-600" />
                  Tanggal Diterima OPD
                </span>
                <p className="mt-1 font-bold text-emerald-950 sm:text-sm">
                  {formatTanggalIndo(lhp.tanggal_diterima_lhp)}
                </p>
                <p className="mt-0.5 text-3xs text-emerald-700">
                  Basis countdown 60 hari tindak lanjut
                </p>
              </div>

              {(lhp.tanggal_mulai_pemeriksaan || lhp.tanggal_selesai_pemeriksaan) && (
                <div className="rounded-2xl border border-line bg-canvas/30 p-4 sm:col-span-2 lg:col-span-3">
                  <span className="text-2xs font-semibold text-muted uppercase tracking-wider">
                    Periode Pemeriksaan di Lapangan
                  </span>
                  <p className="mt-1 font-semibold text-ink text-xs">
                    {lhp.tanggal_mulai_pemeriksaan
                      ? formatTanggalIndo(lhp.tanggal_mulai_pemeriksaan)
                      : "-"}{" "}
                    s.d.{" "}
                    {lhp.tanggal_selesai_pemeriksaan
                      ? formatTanggalIndo(lhp.tanggal_selesai_pemeriksaan)
                      : "-"}
                  </p>
                </div>
              )}
            </div>

            {/* Kartu Berkas Fisik PDF LHP */}
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand">
                    <FileText size={18} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-ink sm:text-sm">
                      Berkas Fisik LHP (PDF)
                    </h4>
                    <p className="text-2xs text-muted">
                      {lhp.file_path
                        ? "Dokumen LHP terunggah aman di server terproteksi"
                        : "Belum ada berkas PDF LHP yang diunggah"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {lhp.file_path && (
                    <button
                      type="button"
                      onClick={handleDownloadFile}
                      disabled={isDownloading}
                      className="button-primary text-xs flex items-center gap-1.5 shadow-xs"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="animate-spin" size={13} />
                          <span>Mengunduh...</span>
                        </>
                      ) : (
                        <>
                          <Download size={13} />
                          <span>Unduh Berkas PDF</span>
                        </>
                      )}
                    </button>
                  )}

                  {canMutate && (
                    <>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadMutation.isPending}
                        className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-brand hover:text-brand shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {uploadMutation.isPending ? (
                          <>
                            <Loader2 className="animate-spin" size={13} />
                            <span>Mengunggah...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={13} />
                            <span>{lhp.file_path ? "Ganti Berkas" : "Unggah Berkas PDF"}</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Hierarki Bertingkat: Temuan & Rekomendasi */}
            <TemuanRekomendasiSection
              lhpId={lhp.id}
              isClosed={lhp.is_closed}
              currentUser={currentUser}
            />

            {/* Riwayat Surat Peringatan */}
            {lhp.surat_peringatans && lhp.surat_peringatans.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-ink">
                  Surat Peringatan Terbit ({lhp.surat_peringatans.length})
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {lhp.surat_peringatans.map((sp) => (
                    <div
                      key={sp.id}
                      className="rounded-xl border border-line bg-surface p-3 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-ink">{sp.level}</span>
                        <span className="ml-1 text-2xs text-muted">({sp.nomor_surat})</span>
                        <p className="text-2xs text-muted">
                          {formatTanggalIndo(sp.tanggal_surat)}
                        </p>
                      </div>
                      {sp.signed_at ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-3xs font-bold text-emerald-700 border border-emerald-200">
                          TTE Terverifikasi
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-3xs font-bold text-slate-600">
                          Draft
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Aksi Modal */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <div className="flex items-center gap-2">
                {canMutate && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEdit(lhp);
                    }}
                    className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-brand hover:text-brand shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>Ubah Metadata</span>
                  </button>
                )}

                {canMutate && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onCloseLhp(lhp);
                    }}
                    className="rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileCheck size={13} />
                    <span>Tandai Selesai</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-muted hover:text-ink transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
