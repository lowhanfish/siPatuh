"use client";

import { AlertTriangle, CheckCircle2, Loader2, Sparkles, UserCheck, Users } from "lucide-react";
import type { SimpegUnitKerjaItem } from "@/features/unit-kerja/types";
import { PenugasanBadge } from "./penugasan-badge";
import { useResolveRecipient } from "@/features/unit-kerja/hooks/use-pejabat";
import { formatTanggalIndo } from "@/features/dashboard/utils/formatters";

type RecipientResolutionCardProps = {
  selectedUnit: SimpegUnitKerjaItem | null;
};

export function RecipientResolutionCard({
  selectedUnit,
}: RecipientResolutionCardProps) {
  const { data: resolution, isLoading } = useResolveRecipient(selectedUnit?.id);

  if (!selectedUnit) {
    return (
      <article className="rounded-2xl border border-dashed border-line bg-surface p-6 text-center shadow-card">
        <span className="mx-auto grid size-10 place-items-center rounded-2xl bg-canvas text-muted">
          <UserCheck size={20} />
        </span>
        <h4 className="mt-3 text-sm font-bold text-ink">Simulasi Penerima Surat Resmi</h4>
        <p className="mt-1 text-xs text-muted max-w-md mx-auto">
          Pilih salah satu Unit Kerja pada tabel untuk melihat kalkulasi otomatis pejabat penerima surat peringatan.
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-line bg-surface p-6 shadow-card space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="eyebrow">Resolusi Otomatis Pejabat</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-2xs font-bold text-brand">
              <Sparkles size={11} />
              Backend Rule
            </span>
          </div>
          <h3 className="text-base font-bold text-ink sm:text-lg">
            {selectedUnit.unit_kerja}
          </h3>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-brand" size={24} />
          <span className="ml-2 text-xs text-muted">Menganalisis kandidat pejabat...</span>
        </div>
      ) : !resolution || !resolution.primary_candidate ? (
        <div className="rounded-xl border border-dashed border-line bg-canvas/40 p-4 text-center">
          <p className="text-xs font-semibold text-ink">Belum Ada Pejabat Aktif Terdaftar</p>
          <p className="mt-1 text-2xs text-muted">
            Tambahkan data Kepala OPD (Definitif atau PLT/PLH) agar sistem dapat menerbitkan surat peringatan resmi.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Kandidat Utama Terpilih */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  Kandidat Utama Penerima Surat
                </span>
                <p className="mt-1 text-base font-bold text-ink">
                  {resolution.primary_candidate.nama}
                </p>
                <p className="text-xs text-muted">
                  NIP: {resolution.primary_candidate.nip} • {resolution.primary_candidate.jabatan}
                </p>
              </div>
              <PenugasanBadge jenis={resolution.primary_candidate.jenis_penugasan} />
            </div>

            <div className="mt-3 flex items-center gap-2 text-2xs text-emerald-900 border-t border-emerald-200/60 pt-2.5">
              <span>Masa Tugas:</span>
              <span className="font-semibold">
                {formatTanggalIndo(resolution.primary_candidate.tanggal_mulai)} s.d.{" "}
                {resolution.primary_candidate.tanggal_selesai
                  ? formatTanggalIndo(resolution.primary_candidate.tanggal_selesai)
                  : "Sekarang"}
              </span>
            </div>
          </div>

          {/* Warning bila memerlukan seleksi manual */}
          {resolution.requires_manual_selection && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">Lebih Dari Satu Kandidat Aktif Sah</p>
                <p className="mt-0.5 text-2xs leading-relaxed text-amber-800">
                  Ditemukan beberapa penugasan aktif (mis. PLT dan Definitif bersamaan). Sistem memprioritaskan PLT, namun Super Admin dapat memilih kandidat alternatif saat pembuatan draft Surat Peringatan.
                </p>
              </div>
            </div>
          )}

          {/* Daftar Semua Kandidat Sah */}
          {resolution.all_candidates.length > 1 && (
            <div className="space-y-2">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1">
                <Users size={12} />
                Seluruh Pejabat Terdaftar ({resolution.all_candidates.length})
              </span>
              <div className="divide-y divide-line/60 rounded-xl border border-line bg-canvas/30 text-xs">
                {resolution.all_candidates.map((cand) => (
                  <div
                    key={cand.id}
                    className="flex items-center justify-between p-2.5"
                  >
                    <div>
                      <p className="font-semibold text-ink">{cand.nama}</p>
                      <p className="text-2xs text-muted">
                        NIP: {cand.nip} • {cand.jabatan}
                      </p>
                    </div>
                    <PenugasanBadge jenis={cand.jenis_penugasan} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
