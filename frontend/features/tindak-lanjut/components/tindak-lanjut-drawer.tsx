"use client";

import { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Download,
  FileCheck2,
  History,
  Lock,
  Plus,
  ShieldCheck,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { RekomendasiItem, TemuanItem } from "@/features/temuan-rekomendasi/types";
import type { AuthUser } from "@/features/auth/types";
import type { StatusRekomendasi } from "@/features/master-data/types";
import type { TindakLanjutItem } from "../types";
import { useFinancialSummary, useTindakLanjutList } from "../hooks/use-tindak-lanjut";
import { downloadTlAttachment, downloadVerifikasiAttachment } from "../api/tindak-lanjut-api";
import { FinancialSummaryCard } from "./financial-summary-card";
import { TindakLanjutModal } from "./tindak-lanjut-modal";
import { VerifikasiModal } from "./verifikasi-modal";
import { formatRupiah } from "@/features/dashboard/utils/formatters";
import { getApiErrorMessage } from "@/lib/api-client";

type TindakLanjutDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  lhpId: string;
  isClosed: boolean;
  temuan: TemuanItem;
  rekomendasi: RekomendasiItem;
  statusList: StatusRekomendasi[];
  currentUser: AuthUser | null;
};

export function TindakLanjutDrawer({
  isOpen,
  onClose,
  lhpId,
  isClosed,
  temuan,
  rekomendasi,
  currentUser,


}: TindakLanjutDrawerProps) {
  const isFinancial =
    rekomendasi.nilai_rekomendasi !== null &&
    rekomendasi.nilai_rekomendasi !== undefined &&
    parseFloat(String(rekomendasi.nilai_rekomendasi)) > 0;

  const { data: tlList = [], isLoading, error } = useTindakLanjutList(
    isOpen ? rekomendasi.id : null,
  );

  const { data: finSummary, isLoading: isFinLoading } = useFinancialSummary(
    isOpen && isFinancial ? rekomendasi.id : null,
  );

  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [verifyingTl, setVerifyingTl] = useState<TindakLanjutItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const canInputTl =
    (currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ADMIN_IRBAN") &&
    !isClosed;

  const canVerify =
    (currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ADMIN_IRBAN") &&
    !isClosed;

  async function handleDownloadTl(tlId: string, attId: string, filename: string) {
    try {
      setDownloadingId(attId);
      await downloadTlAttachment(tlId, attId, filename);
      toast.success(`Mengunduh ${filename}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDownloadVerif(verifId: string, attId: string, filename: string) {
    try {
      setDownloadingId(attId);
      await downloadVerifikasiAttachment(verifId, attId, filename);
      toast.success(`Mengunduh ${filename}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl border border-line bg-surface shadow-modal overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4 bg-canvas/40">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="eyebrow">Tindak Lanjut & Verifikasi</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-2xs font-bold text-blue-700">
                <History size={11} />
                Histori Terstruktur
              </span>
            </div>
            <h3 className="text-base font-bold text-ink sm:text-lg">
              Rekomendasi #{temuan.nomor_urut}.{rekomendasi.nomor_urut}
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Detail Ringkas Rekomendasi & Temuan Induk */}
          <div className="rounded-2xl border border-line bg-canvas/30 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2">
              <div className="flex items-center gap-2 text-2xs font-medium text-muted">
                <span className="font-bold text-ink">Temuan #{temuan.nomor_urut}:</span>
                <span className="line-clamp-1">{temuan.judul}</span>
              </div>
              {rekomendasi.status_rekomendasi && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-2xs font-bold ${
                    rekomendasi.status_rekomendasi.kategori === "SELESAI"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}
                >
                  <FileCheck2 size={11} />
                  <span>{rekomendasi.status_rekomendasi.nama}</span>
                </span>
              )}
            </div>

            <div>
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted block mb-1">
                Uraian Rekomendasi
              </span>
              <p className="text-xs text-ink leading-relaxed whitespace-pre-line">
                {rekomendasi.uraian}
              </p>
            </div>
          </div>

          {/* Kartu Finansial (jika ada nilai rekomendasi) */}
          {isFinancial && (
            <FinancialSummaryCard summary={finSummary} isLoading={isFinLoading} />
          )}

          {/* Action Bar & Timeline Title */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <div>
              <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                <History size={16} className="text-brand" />
                <span>Riwayat Tindak Lanjut ({tlList.length})</span>
              </h4>
              <p className="text-2xs text-muted">
                Daftar dokumen & tindakan penyelesaian yang diinput oleh Admin Irban
              </p>
            </div>

            {canInputTl && (
              <button
                type="button"
                onClick={() => setIsInputModalOpen(true)}
                className="button-primary text-xs flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
              >
                <Plus size={14} />
                <span>Input Tindak Lanjut</span>
              </button>
            )}
          </div>

          {/* Timeline List */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Loader2 className="animate-spin text-brand" size={24} />
              <p className="mt-2 text-xs text-muted">Memuat riwayat tindak lanjut...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-xs text-rose-800">
              <AlertCircle className="mx-auto size-5 text-rose-600 mb-1" />
              <p className="font-bold">Gagal memuat tindak lanjut</p>
              <p className="mt-0.5 text-2xs">{getApiErrorMessage(error)}</p>
            </div>
          ) : tlList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-canvas/20 p-8 text-center">
              <History className="mx-auto size-10 text-muted/60" />
              <h5 className="mt-3 text-xs font-bold text-ink">Belum Ada Tindak Lanjut</h5>
              <p className="mt-1 text-2xs text-muted max-w-sm mx-auto">
                {canInputTl
                  ? "OPD yang bersangkutan belum menyampaikan berkas atau bukti tindak lanjut. Klik 'Input Tindak Lanjut' jika berkas telah diterima."
                  : "Belum ada catatan tindak lanjut yang diajukan untuk rekomendasi ini."}
              </p>
              {canInputTl && (
                <button
                  type="button"
                  onClick={() => setIsInputModalOpen(true)}
                  className="button-primary text-xs mt-3 inline-flex items-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>Input Tindak Lanjut Sekarang</span>
                </button>
              )}
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
              {tlList.map((tl, index) => {
                const numericTlVal = parseFloat(String(tl.nilai_tindak_lanjut || 0));
                const latestVerif = tl.verifikasis && tl.verifikasis.length > 0 ? tl.verifikasis[0] : null;
                const isVerified = !!latestVerif;

                return (
                  <div key={tl.id} className="relative group">
                    {/* Bullet marker */}
                    <div
                      className={`absolute -left-6 top-1.5 size-5 rounded-full border-2 bg-surface grid place-items-center ${
                        isVerified
                          ? "border-emerald-600 text-emerald-600"
                          : "border-amber-500 text-amber-600"
                      }`}
                    >
                      {isVerified ? (
                        <CheckCircle2 size={12} className="fill-emerald-100" />
                      ) : (
                        <Clock size={12} className="fill-amber-100" />
                      )}
                    </div>

                    {/* Card Konten TL */}
                    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line/60 pb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-2xs font-extrabold text-brand uppercase tracking-wider">
                              Tindak Lanjut #{tlList.length - index}
                            </span>
                            <span className="text-2xs text-muted">•</span>
                            <span className="text-2xs text-muted flex items-center gap-1">
                              <Calendar size={11} />
                              {new Date(tl.tanggal_diterima).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Status Verifikasi Badge & Tombol Verifikasi */}
                        <div className="flex items-center gap-2">
                          {isVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-2xs font-bold text-emerald-700 border border-emerald-200">
                              <ShieldCheck size={11} />
                              <span>Diverifikasi</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-2xs font-bold text-amber-800 border border-amber-200">
                              <Clock size={11} />
                              <span>Belum Verifikasi</span>
                            </span>
                          )}

                          {!isVerified && canVerify && (
                            <button
                              type="button"
                              onClick={() => setVerifyingTl(tl)}
                              className="rounded-xl bg-brand text-surface hover:bg-brand/90 px-2.5 py-1 text-2xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <ShieldCheck size={12} />
                              <span>Verifikasi Sekarang</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Uraian Tindakan OPD */}
                      <p className="text-xs text-ink whitespace-pre-line leading-relaxed">
                        {tl.uraian}
                      </p>

                      {/* Nilai Setor Kas Finansial jika ada */}
                      {!isNaN(numericTlVal) && numericTlVal > 0 && (
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-2xs font-bold text-emerald-800 border border-emerald-200">
                          <Coins size={12} />
                          <span>Nilai Setor: {formatRupiah(numericTlVal)}</span>
                        </div>
                      )}

                      {/* Lampiran Bukti TL */}
                      {tl.attachments && tl.attachments.length > 0 && (
                        <div className="pt-2 border-t border-line/40">
                          <span className="text-2xs font-semibold text-muted block mb-1.5">
                            Dokumen Bukti Tindak Lanjut:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {tl.attachments.map((att) => (
                              <button
                                key={att.id}
                                type="button"
                                onClick={() => handleDownloadTl(tl.id, att.id, att.original_name)}
                                disabled={downloadingId === att.id}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-canvas/50 px-2.5 py-1.5 text-2xs font-semibold text-ink hover:border-brand hover:text-brand transition-colors cursor-pointer"
                                title="Download dokumen bukti"
                              >
                                {downloadingId === att.id ? (
                                  <Loader2 size={12} className="animate-spin text-brand" />
                                ) : (
                                  <Download size={12} />
                                )}
                                <span className="max-w-[180px] truncate">{att.original_name}</span>
                                <span className="text-muted text-[10px]">
                                  ({(att.file_size / 1024).toFixed(0)} KB)
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Riwayat Verifikasi yang Terhubung */}
                      {latestVerif && (
                        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 text-xs space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1 text-2xs font-extrabold text-emerald-800 uppercase tracking-wider">
                              <ShieldCheck size={12} />
                              Catatan Verifikasi Tim Irban
                            </span>
                            <span className="text-[10px] text-emerald-700">
                              {new Date(latestVerif.verified_at).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          <p className="text-xs text-ink/90 leading-relaxed whitespace-pre-line">
                            {latestVerif.catatan}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-2xs text-muted">Keputusan Status:</span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 text-2xs font-bold text-ink border border-line shadow-xs">
                              {latestVerif.status_rekomendasi?.nama || "Diperbarui"}
                            </span>
                          </div>

                          {/* Lampiran Verifikasi jika ada */}
                          {latestVerif.attachments && latestVerif.attachments.length > 0 && (
                            <div className="pt-2 border-t border-emerald-200/60">
                              <span className="text-2xs font-semibold text-muted block mb-1">
                                Dokumen Bukti Verifikasi:
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {latestVerif.attachments.map((att) => (
                                  <button
                                    key={att.id}
                                    type="button"
                                    onClick={() => handleDownloadVerif(latestVerif.id, att.id, att.original_name)}
                                    disabled={downloadingId === att.id}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 py-1 text-2xs font-semibold text-ink hover:border-brand hover:text-brand transition-colors cursor-pointer"
                                  >
                                    {downloadingId === att.id ? (
                                      <Loader2 size={12} className="animate-spin text-brand" />
                                    ) : (
                                      <Download size={12} />
                                    )}
                                    <span className="max-w-[180px] truncate">{att.original_name}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between border-t border-line px-5 py-3.5 bg-canvas/40 text-2xs text-muted">
          <div className="flex items-center gap-2">
            <Lock size={12} />
            <span>Verifikasi manual 100% oleh Tim Irban / Super Admin.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="button-secondary text-xs"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Modal Input TL */}
      <TindakLanjutModal
        isOpen={isInputModalOpen}
        onClose={() => setIsInputModalOpen(false)}
        rekomendasiId={rekomendasi.id}
        lhpId={lhpId}
        rekomendasiUraian={rekomendasi.uraian}
        nomorDisplay={`#${temuan.nomor_urut}.${rekomendasi.nomor_urut}`}
      />

      {/* Modal Verifikasi TL */}
      {verifyingTl && (
        <VerifikasiModal
          isOpen={!!verifyingTl}
          onClose={() => setVerifyingTl(null)}
          rekomendasiId={rekomendasi.id}
          lhpId={lhpId}
          tindakLanjutId={verifyingTl.id}
          nomorDisplay={`#${temuan.nomor_urut}.${rekomendasi.nomor_urut}`}
          tindakLanjutUraian={verifyingTl.uraian}
          currentStatusId={rekomendasi.status_rekomendasi_id}
        />
      )}
    </div>
  );
}
