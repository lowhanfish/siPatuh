"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  FileCode,
  Info,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import type { SuratTemplate } from "@/features/master-data/types";
import {
  useCreateSuratTemplate,
  useUpdateSuratTemplate,
} from "@/features/master-data/hooks/use-master-data";
import { getApiErrorMessage } from "@/lib/api-client";

type SuratTemplateModalProps = {
  template: SuratTemplate | null;
  isOpen: boolean;
  onClose: () => void;
};

export function SuratTemplateModal({
  template,
  isOpen,
  onClose,
}: SuratTemplateModalProps) {
  if (!isOpen) return null;
  return <SuratTemplateModalContent template={template} onClose={onClose} />;
}

const AVAILABLE_TAGS = [
  { tag: "{{nomor_surat}}", desc: "Nomor resmi surat peringatan" },
  { tag: "{{tanggal_surat}}", desc: "Tanggal terbit surat (Indonesia)" },
  { tag: "{{nama_opd}}", desc: "Nama Unit Kerja / OPD tujuan" },
  { tag: "{{nama_pejabat}}", desc: "Nama Kepala OPD penerima surat" },
  { tag: "{{nip_pejabat}}", desc: "NIP Kepala OPD penerima surat" },
  { tag: "{{jabatan_pejabat}}", desc: "Jabatan struktural penerima" },
  { tag: "{{nomor_lhp}}", desc: "Nomor LHP yang mendasari" },
  { tag: "{{tanggal_lhp}}", desc: "Tanggal terbit dokumen LHP" },
  { tag: "{{hari_tunggakan}}", desc: "Jumlah hari kalender sejak LHP diterima" },
  { tag: "#tagTTD#", desc: "Anchor penempatan stempel digital TTE BSrE" },
];

function SuratTemplateModalContent({
  template,
  onClose,
}: {
  template: SuratTemplate | null;
  onClose: () => void;
}) {
  const isEditing = !!template;
  const [jenisSurat, setJenisSurat] = useState(template?.jenis_surat || "SP1");
  const [judul, setJudul] = useState(template?.judul || "");
  const [kontenHtml, setKontenHtml] = useState(template?.konten_html || "");
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateSuratTemplate();
  const updateMutation = useUpdateSuratTemplate();
  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleInsertTag(tag: string) {
    setKontenHtml((prev) => prev + " " + tag);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!judul.trim()) {
      setFormError("Judul template surat wajib diisi.");
      return;
    }
    if (!kontenHtml.trim()) {
      setFormError("Konten HTML template surat wajib diisi.");
      return;
    }

    try {
      setFormError(null);
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: template.id,
          input: {
            judul: judul.trim(),
            konten_html: kontenHtml,
          },
        });
        toast.success(`Template surat "${judul.trim()}" berhasil diperbarui.`);
      } else {
        await createMutation.mutateAsync({
          jenis_surat: jenisSurat.trim().toUpperCase(),
          judul: judul.trim(),
          konten_html: kontenHtml,
        });
        toast.success(`Template surat "${judul.trim()}" berhasil dibuat.`);
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
      aria-labelledby="template-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 backdrop-blur-xs p-4 sm:p-6"
    >
      <div className="flex min-h-full items-start sm:items-center justify-center py-4 sm:py-8">
        <div className="w-full max-w-3xl rounded-3xl border border-line bg-surface p-6 shadow-panel sm:p-8 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col my-auto">
          <div className="shrink-0 flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand">
                <FileCode aria-hidden size={20} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="template-modal-title" className="text-lg font-bold text-ink sm:text-xl">
                    {isEditing ? `Ubah Template Surat (Versi ${template.versi})` : "Tambah Template Surat Baru"}
                  </h2>
                </div>
                <p className="text-xs text-muted">
                  Format surat peringatan resmi berbasis HTML dengan tag variabel dinamis
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

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden mt-4">
            <div className="overflow-y-auto pr-1 -mr-1 py-1 space-y-4 flex-1 min-h-0">
              {/* Informasi Versioning Backend */}
              {isEditing && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
                  <Info className="size-4 shrink-0 text-brand mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="font-semibold">Aturan Versioning Non-Retroaktif:</strong> Mengubah konten HTML akan otomatis menerbitkan <strong>Versi {template.versi + 1}</strong>. Surat peringatan historis yang telah terbit sebelumnya tetap menggunakan arsip versi aslinya.
                  </div>
                </div>
              )}

              {formError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle className="size-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="template-jenis" className="form-label text-xs">
                Jenis Surat *
              </label>
              {isEditing ? (
                <input
                  id="template-jenis"
                  type="text"
                  value={jenisSurat}
                  disabled
                  className="form-input text-xs sm:text-sm bg-canvas text-muted cursor-not-allowed"
                />
              ) : (
                <select
                  id="template-jenis"
                  value={jenisSurat}
                  onChange={(e) => setJenisSurat(e.target.value)}
                  className="form-input text-xs sm:text-sm cursor-pointer"
                >
                  <option value="SP1">SP1 (Surat Peringatan I)</option>
                  <option value="SP2">SP2 (Surat Peringatan II)</option>
                  <option value="SP3">SP3 (Surat Peringatan III)</option>
                  <option value="PEMBERITAHUAN">PEMBERITAHUAN (Umum)</option>
                </select>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="template-judul" className="form-label text-xs">
                Judul / Keterangan Template *
              </label>
              <input
                id="template-judul"
                type="text"
                placeholder="mis. Format Resmi Surat Peringatan I (SP1) 2026"
                value={judul}
                onChange={(e) => {
                  setJudul(e.target.value);
                  setFormError(null);
                }}
                className="form-input text-xs sm:text-sm"
                required
              />
            </div>
          </div>

          {/* Quick Insert Variabel Tags */}
          <div className="rounded-xl border border-line bg-canvas/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                <Sparkles size={11} className="text-brand" />
                Klik Untuk Sisipkan Variabel Tag Otomatis:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_TAGS.map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => handleInsertTag(item.tag)}
                  title={item.desc}
                  className="rounded-lg border border-line bg-surface px-2 py-1 font-mono text-2xs text-brand hover:border-brand hover:bg-brand-soft/30 transition-colors"
                >
                  {item.tag}
                </button>
              ))}
            </div>
          </div>

          {/* Konten HTML Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="template-konten" className="form-label text-xs">
                Konten Surat (HTML Format) *
              </label>
              <span className="text-2xs text-muted">
                Wajib menyertakan <code>#tagTTD#</code> sebagai lokasi tandatangan digital
              </span>
            </div>
            <textarea
              id="template-konten"
              rows={12}
              value={kontenHtml}
              onChange={(e) => {
                setKontenHtml(e.target.value);
                setFormError(null);
              }}
              placeholder="<p>Dengan hormat,</p><p>Sehubungan dengan LHP nomor {{nomor_lhp}}...</p><p>#tagTTD#</p>"
              className="form-input font-mono text-xs leading-relaxed"
              required
            />
          </div>
            </div>

          <div className="shrink-0 flex items-center justify-end gap-3 border-t border-line/60 pt-4 mt-4 bg-surface">
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
                  <span>{isEditing ? "Simpan Perubahan Template" : "Simpan Template"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);
}
