"use client";

import { Eye, X } from "lucide-react";
import type { SuratTemplate } from "@/features/master-data/types";

type SuratTemplatePreviewModalProps = {
  template: SuratTemplate | null;
  isOpen: boolean;
  onClose: () => void;
};

export function SuratTemplatePreviewModal({
  template,
  isOpen,
  onClose,
}: SuratTemplatePreviewModalProps) {
  if (!isOpen || !template) return null;

  // Isi variabel placeholder dengan data simulasi realistis untuk pratinjau
  const mockRenderedHtml = template.konten_html
    .replace(/\{\{\s*nomor_surat\s*\}\}/g, "700/012/ITDA/2026")
    .replace(/\{\{\s*tanggal_surat\s*\}\}/g, "28 September 2026")
    .replace(/\{\{\s*nama_opd\s*\}\}/g, "Dinas Pendidikan dan Kebudayaan")
    .replace(/\{\{\s*nama_pejabat\s*\}\}/g, "Dr. H. Ahmad Sudrajat, M.Si")
    .replace(/\{\{\s*nip_pejabat\s*\}\}/g, "19720510 199803 1 005")
    .replace(/\{\{\s*jabatan_pejabat\s*\}\}/g, "Kepala Dinas")
    .replace(/\{\{\s*nomor_lhp\s*\}\}/g, "700/004/LHP-ITDA/2026")
    .replace(/\{\{\s*tanggal_lhp\s*\}\}/g, "15 Agustus 2026")
    .replace(/\{\{\s*hari_tunggakan\s*\}\}/g, "44")
    .replace(
      /#tagTTD#/g,
      '<div style="display:inline-block; border:1px dashed #3b82f6; padding:8px 16px; border-radius:8px; background:#eff6ff; color:#1d4ed8; font-weight:bold; font-size:11px;">[Anchor Sertifikat Elektronik BSrE / #tagTTD#]</div>',
    );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-preview-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 backdrop-blur-xs p-4 sm:p-6"
    >
      <div className="flex min-h-full items-start sm:items-center justify-center py-4 sm:py-8">
        <div className="w-full max-w-3xl rounded-3xl border border-line bg-surface p-6 shadow-panel sm:p-8 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col my-auto">
          {/* Header Modal */}
          <div className="shrink-0 flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand">
                <Eye aria-hidden size={20} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="template-preview-title" className="text-lg font-bold text-ink sm:text-xl">
                    Pratinjau: {template.judul}
                  </h2>
                  <span className="rounded-md bg-brand-soft px-2 py-0.5 text-2xs font-bold text-brand">
                    Versi {template.versi}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Jenis Surat: <strong>{template.jenis_surat}</strong> (Simulasi tampilan dengan data sampel OPD)
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

          {/* Paper Document Preview Container */}
          <div className="mt-4 flex-1 overflow-y-auto rounded-2xl border border-line bg-canvas p-6 min-h-0">
            <div className="mx-auto max-w-2xl rounded-xl border border-line bg-white p-8 shadow-card text-ink">
              {/* Header Instansi Inspektorat */}
              <div className="border-b-2 border-black pb-3 text-center">
                <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                  Pemerintah Kabupaten Konawe Selatan
                </h3>
                <h2 className="text-base font-extrabold uppercase tracking-wide text-black">
                  Inspektorat Daerah
                </h2>
                <p className="text-2xs text-neutral-600">
                  Kompleks Perkantoran Pemerintah Daerah Kab. Konawe Selatan, Andoolo
                </p>
              </div>

              {/* Dokumen Rendered HTML */}
              <div
                className="mt-6 text-xs text-black leading-relaxed space-y-3 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: mockRenderedHtml }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 mt-4 flex items-center justify-between border-t border-line/60 pt-4 text-xs text-muted">
            <span>Variabel yang disimulasikan: nomor surat, tanggal, OPD, nama pejabat, & anchor #tagTTD#.</span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-canvas transition-colors"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
