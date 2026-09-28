"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Clock,
  Download,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import { useSuratPeringatanDetail } from "../hooks/use-surat-peringatan";
import {
  downloadDraftPdf,
  downloadSignedPdf,
} from "../api/surat-peringatan-api";
import { formatRupiah, formatTanggalIndo } from "@/features/dashboard/utils/formatters";
import { getApiErrorMessage } from "@/lib/api-client";

type SpDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  suratId: string | null;
};

export function SpDetailModal({
  isOpen,
  onClose,
  suratId,
}: SpDetailModalProps) {
  const { data: detail, isLoading, error } = useSuratPeringatanDetail(
    isOpen ? suratId : null,
  );

  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !suratId) return null;

  async function handleDownload() {
    if (!detail) return;
    try {
      setDownloading(true);
      const isSigned = !!detail.signed_at;
      if (isSigned) {
        const filename = `${detail.level}_${detail.nomor_surat.replace(/[\/\\]/g, "_")}_Signed.pdf`;
        await downloadSignedPdf(detail.id, filename);
      } else {
        const filename = `Draft_${detail.level}_${detail.nomor_surat.replace(/[\/\\]/g, "_")}.pdf`;
        await downloadDraftPdf(detail.id, filename);
      }
      toast.success("Dokumen PDF berhasil diunduh.");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  }

  const isSigned = !!detail?.signed_at;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl border border-line bg-surface shadow-modal overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4 bg-canvas/40">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="eyebrow">Detail Dokumen Resmi</span>
              {detail && (
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-2xs font-bold text-blue-700 border border-blue-200">
                  {detail.level}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-ink sm:text-lg">
              {detail ? detail.nomor_surat : "Memuat..."}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="animate-spin text-brand" size={32} />
              <p className="mt-3 text-xs text-muted">Memuat rincian surat peringatan...</p>
            </div>
          ) : error || !detail ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-xs text-rose-800">
              <p className="font-bold">Gagal memuat detail surat</p>
              <p className="mt-0.5 text-2xs">{getApiErrorMessage(error)}</p>
            </div>
          ) : (
            <>
              {/* Status Banner */}
              {isSigned ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-900 flex items-start gap-3">
                  <ShieldCheck size={20} className="shrink-0 text-emerald-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">
                      Dokumen Sah Bertanda Tangan Elektronik (TTE)
                    </p>
                    <p className="text-2xs text-emerald-800 leading-relaxed">
                      Ditandatangani pada {formatTanggalIndo(detail.signed_at!)}. Dokumen ini telah terkunci secara permanen dan sah menurut ketentuan BSrE.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 flex items-start gap-3">
                  <Clock size={20} className="shrink-0 text-amber-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Draft Surat Peringatan</p>
                    <p className="text-2xs text-amber-800 leading-relaxed">
                      Dokumen ini masih berstatus draft dan belum ditandatangani secara elektronik (TTE).
                    </p>
                  </div>
                </div>
              )}

              {/* Detail Metadata Surat */}
              <div className="rounded-2xl border border-line bg-canvas/30 p-4 grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <span className="block text-2xs text-muted font-medium">Tanggal Surat:</span>
                  <span className="font-bold text-ink">{formatTanggalIndo(detail.tanggal_surat)}</span>
                </div>
                <div>
                  <span className="block text-2xs text-muted font-medium">Perangkat Daerah Tujuan:</span>
                  <span className="font-bold text-ink">{detail.unit_kerja_nama}</span>
                </div>
                <div>
                  <span className="block text-2xs text-muted font-medium">Dasar Pemeriksaan (LHP):</span>
                  <span className="font-bold text-ink">{detail.lhp.nomor_lhp}</span>
                </div>
                <div>
                  <span className="block text-2xs text-muted font-medium">Pejabat Penerima / NIP:</span>
                  <span className="font-bold text-ink">
                    {detail.recipient_nama || "-"} {detail.recipient_nip ? `(${detail.recipient_nip})` : ""}
                  </span>
                </div>
              </div>

              {/* Daftar Rekomendasi Ter-snapshot */}
              <div className="space-y-2">
                <span className="text-2xs font-semibold uppercase tracking-wider text-muted block">
                  Snapshot Rekomendasi Belum Selesai ({detail.items?.length || 0})
                </span>

                <div className="rounded-2xl border border-line divide-y divide-line/60 bg-surface overflow-hidden">
                  {detail.items && detail.items.length > 0 ? (
                    detail.items.map((item, idx) => (
                      <div key={item.id} className="p-3.5 text-xs space-y-1 hover:bg-canvas/20 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-ink">Item #{idx + 1}</span>
                          {item.nilai_rekomendasi_snapshot && (
                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-2xs font-bold text-emerald-800 border border-emerald-200">
                              {formatRupiah(item.nilai_rekomendasi_snapshot)}
                            </span>
                          )}
                        </div>
                        <p className="text-2xs text-muted leading-relaxed whitespace-pre-line">
                          {item.uraian_snapshot}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-2xs text-muted">
                      Tidak ada rincian item rekomendasi terlampir.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line px-5 py-4 bg-canvas/40">
          <button
            type="button"
            onClick={onClose}
            className="button-secondary text-xs"
          >
            Tutup
          </button>

          {detail && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="button-primary text-xs flex items-center gap-1.5 shadow-xs"
            >
              {downloading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              <span>{isSigned ? "Download Signed PDF" : "Download Draft PDF"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
