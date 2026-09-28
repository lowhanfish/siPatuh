"use client";

import { useState } from "react";
import {
  Download,
  Eye,
  FileCheck2,
  PenTool,
  Trash2,
  Loader2,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import type { SuratPeringatanItem } from "../types";
import {
  downloadDraftPdf,
  downloadSignedPdf,
} from "../api/surat-peringatan-api";
import { useDeleteSuratPeringatan } from "../hooks/use-surat-peringatan";
import { formatTanggalIndo } from "@/features/dashboard/utils/formatters";
import { getApiErrorMessage } from "@/lib/api-client";

type SpListTableProps = {
  items: SuratPeringatanItem[];
  isLoading: boolean;
  canMutate: boolean;
  onOpenSignTte: (sp: SuratPeringatanItem) => void;
  onOpenDetail: (sp: SuratPeringatanItem) => void;
};

export function SpListTable({
  items,
  isLoading,
  canMutate,
  onOpenSignTte,
  onOpenDetail,
}: SpListTableProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const deleteMutation = useDeleteSuratPeringatan();

  async function handleDownloadDraft(sp: SuratPeringatanItem) {
    try {
      setDownloadingId(`draft-${sp.id}`);
      const filename = `Draft_${sp.level}_${sp.nomor_surat.replace(/[\/\\]/g, "_")}.pdf`;
      await downloadDraftPdf(sp.id, filename);
      toast.success("Draft PDF berhasil diunduh.");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDownloadSigned(sp: SuratPeringatanItem) {
    try {
      setDownloadingId(`signed-${sp.id}`);
      const filename = `${sp.level}_${sp.nomor_surat.replace(/[\/\\]/g, "_")}_Signed.pdf`;
      await downloadSignedPdf(sp.id, filename);
      toast.success("Signed PDF berhasil diunduh.");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(sp: SuratPeringatanItem) {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus draft Surat Peringatan ${sp.nomor_surat}? Tindakan ini tidak dapat dibatalkan.`,
      )
    ) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(sp.id);
      toast.success(`Surat Peringatan ${sp.nomor_surat} berhasil dihapus.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Loader2 className="animate-spin text-brand" size={32} />
        <p className="mt-3 text-xs text-muted">Memuat riwayat Surat Peringatan...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center shadow-card">
        <Mail className="mx-auto size-12 text-muted/60" />
        <h4 className="mt-3 text-base font-bold text-ink">Belum Ada Surat Peringatan</h4>
        <p className="mt-1 text-xs text-muted max-w-md mx-auto">
          Belum ada draft maupun surat peringatan yang diterbitkan. Anda dapat menerbitkan surat peringatan melalui tab &ldquo;Jatuh Tempo (Due)&rdquo;.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-line bg-canvas/60 text-2xs font-bold uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3.5">Nomor & Level Surat</th>
              <th className="px-4 py-3.5">LHP & OPD Tujuan</th>
              <th className="px-4 py-3.5">Tanggal Surat</th>
              <th className="px-4 py-3.5">Status TTE</th>
              <th className="px-4 py-3.5">Lampiran Snapshot</th>
              <th className="px-4 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {items.map((sp) => {
              const isSigned = !!sp.signed_at;
              const levelBadgeColor =
                sp.level === "SP3"
                  ? "bg-rose-50 text-rose-800 border-rose-200"
                  : sp.level === "SP2"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-blue-50 text-blue-800 border-blue-200";

              return (
                <tr key={sp.id} className="hover:bg-canvas/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-2xs font-extrabold border ${levelBadgeColor}`}
                      >
                        {sp.level}
                      </span>
                      <span className="font-bold text-ink">{sp.nomor_surat}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-bold text-ink block">
                      {sp.unit_kerja_nama || "Perangkat Daerah"}
                    </span>
                    <span className="text-2xs text-muted">
                      LHP: {sp.lhp.nomor_lhp}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-muted whitespace-nowrap">
                    {formatTanggalIndo(sp.tanggal_surat)}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {isSigned ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-2xs font-bold text-emerald-700 border border-emerald-200">
                          <FileCheck2 size={11} />
                          <span>Signed (TTE)</span>
                        </span>
                        <span className="block text-[10px] text-muted">
                          {formatTanggalIndo(sp.signed_at!)}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-2xs font-bold text-amber-800 border border-amber-200">
                        <PenTool size={11} />
                        <span>Draft (Belum TTE)</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-muted">
                    <span className="rounded-md bg-canvas px-2 py-1 text-2xs font-semibold border border-line">
                      {sp.items_count} Rekomendasi
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenDetail(sp)}
                        className="rounded-lg border border-line bg-surface p-1.5 text-muted hover:text-ink transition-colors cursor-pointer"
                        title="Lihat Detail Surat & Rekomendasi"
                      >
                        <Eye size={13} />
                      </button>

                      {isSigned ? (
                        <button
                          type="button"
                          onClick={() => handleDownloadSigned(sp)}
                          disabled={downloadingId === `signed-${sp.id}`}
                          className="button-primary text-xs inline-flex items-center gap-1 shadow-xs"
                          title="Download Berkas PDF Resmi Signed TTE"
                        >
                          {downloadingId === `signed-${sp.id}` ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Download size={12} />
                          )}
                          <span>Download Signed PDF</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDownloadDraft(sp)}
                            disabled={downloadingId === `draft-${sp.id}`}
                            className="rounded-lg border border-line bg-surface px-2.5 py-1 text-2xs font-bold text-muted hover:text-ink transition-colors cursor-pointer flex items-center gap-1"
                            title="Unduh Draft PDF untuk pratinjau"
                          >
                            {downloadingId === `draft-${sp.id}` ? (
                              <Loader2 size={11} className="animate-spin text-brand" />
                            ) : (
                              <Download size={11} />
                            )}
                            <span>Draft PDF</span>
                          </button>

                          {canMutate && (
                            <button
                              type="button"
                              onClick={() => onOpenSignTte(sp)}
                              className="rounded-lg bg-emerald-600 text-surface hover:bg-emerald-700 px-2.5 py-1 text-2xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                              title="Tandatangani secara elektronik via BSrE"
                            >
                              <PenTool size={11} />
                              <span>TTE Sekarang</span>
                            </button>
                          )}

                          {canMutate && (
                            <button
                              type="button"
                              onClick={() => handleDelete(sp)}
                              className="rounded-lg border border-line bg-surface p-1.5 text-muted hover:text-rose-600 hover:border-rose-300 transition-colors cursor-pointer"
                              title="Hapus Draft Surat Peringatan"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
