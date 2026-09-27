"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Edit2,
  Eye,
  FileCode,
  Filter,
  Loader2,
  Plus,
  Power,
  XCircle,
} from "lucide-react";
import type { SuratTemplate } from "@/features/master-data/types";
import { useUpdateSuratTemplate } from "@/features/master-data/hooks/use-master-data";
import { formatTanggalIndo } from "@/features/dashboard/utils/formatters";
import { getApiErrorMessage } from "@/lib/api-client";

type SuratTemplateTableProps = {
  templates: SuratTemplate[];
  isLoading: boolean;
  selectedJenisSurat: string;
  onJenisSuratChange: (jenis: string) => void;
  onAdd: () => void;
  onEdit: (template: SuratTemplate) => void;
  onPreview: (template: SuratTemplate) => void;
};

export function SuratTemplateTable({
  templates,
  isLoading,
  selectedJenisSurat,
  onJenisSuratChange,
  onAdd,
  onEdit,
  onPreview,
}: SuratTemplateTableProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const updateMutation = useUpdateSuratTemplate();

  async function handleToggleActive(template: SuratTemplate) {
    try {
      setTogglingId(template.id);
      await updateMutation.mutateAsync({
        id: template.id,
        input: { is_active: !template.is_active },
      });
      toast.success(
        `Template "${template.judul}" (v${template.versi}) berhasil di${template.is_active ? "nonaktifkan" : "aktifkan"}.`,
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar Filter */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1 text-xs font-semibold text-muted">
            <Filter size={13} />
            Filter Jenis Surat:
          </span>

          <select
            aria-label="Filter jenis surat template"
            value={selectedJenisSurat}
            onChange={(e) => onJenisSuratChange(e.target.value)}
            className="rounded-xl border border-line bg-canvas/60 px-3 py-2 text-xs font-semibold text-ink outline-none cursor-pointer"
          >
            <option value="ALL">Semua Jenis Surat</option>
            <option value="SP1">SP1 (Surat Peringatan I)</option>
            <option value="SP2">SP2 (Surat Peringatan II)</option>
            <option value="SP3">SP3 (Surat Peringatan III)</option>
            <option value="PEMBERITAHUAN">PEMBERITAHUAN</option>
          </select>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="button-primary text-xs sm:text-sm flex items-center gap-1.5 shrink-0"
        >
          <Plus size={15} />
          <span>Tambah Template Surat</span>
        </button>
      </div>

      {/* Tabel */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="animate-spin text-brand" size={28} />
            <p className="mt-3 text-xs text-muted">Memuat data template surat...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileCode className="text-muted" size={28} />
            <p className="mt-3 text-sm font-semibold text-ink">Tidak ada template surat</p>
            <p className="mt-1 max-w-sm text-xs text-muted">
              Belum ada template surat yang terdaftar untuk filter ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-muted">
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    Jenis & Versi
                  </th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    Judul Template
                  </th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    Terakhir Diperbarui
                  </th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider text-center">
                    Status
                  </th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {templates.map((tpl) => (
                  <tr key={tpl.id} className="transition-colors hover:bg-canvas/40">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-ink">{tpl.jenis_surat}</span>
                        <span className="rounded-md bg-brand-soft px-2 py-0.5 font-mono text-2xs font-bold text-brand">
                          v{tpl.versi}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-ink sm:text-sm">{tpl.judul}</div>
                      <p className="text-2xs text-muted truncate max-w-md">
                        {tpl.konten_html.replace(/<[^>]*>/g, " ").substring(0, 80)}...
                      </p>
                    </td>

                    <td className="px-4 py-3.5 text-muted">
                      {formatTanggalIndo(tpl.updated_at)}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {tpl.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700">
                          <CheckCircle2 size={12} />
                          Aktif Digunakan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-600">
                          <XCircle size={12} />
                          Arsip / Nonaktif
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onPreview(tpl)}
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 font-semibold text-brand hover:border-brand shadow-xs transition-colors"
                          title="Pratinjau tampilan surat"
                        >
                          <Eye size={13} />
                          <span>Pratinjau</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onEdit(tpl)}
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 font-semibold text-ink hover:border-brand hover:text-brand shadow-xs transition-colors"
                          title="Ubah template surat"
                        >
                          <Edit2 size={13} />
                          <span>Ubah</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(tpl)}
                          disabled={togglingId === tpl.id}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-semibold shadow-xs transition-colors ${
                            tpl.is_active
                              ? "border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100"
                              : "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                          title={tpl.is_active ? "Nonaktifkan template" : "Jadikan template aktif"}
                        >
                          {togglingId === tpl.id ? (
                            <Loader2 className="animate-spin" size={13} />
                          ) : (
                            <Power size={13} />
                          )}
                          <span>{tpl.is_active ? "Nonaktifkan" : "Aktifkan"}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-line/60 bg-canvas/30 px-4 py-3 text-xs text-muted">
          <span>Menampilkan {templates.length} template surat</span>
          <span>Perubahan konten otomatis menaikkan versi untuk menjaga integritas surat historis</span>
        </div>
      </div>
    </div>
  );
}
