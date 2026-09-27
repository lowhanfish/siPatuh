"use client";

import { useState } from "react";
import {
  ClipboardList,
  FileCode,
  ListOrdered,
  Plus,
} from "lucide-react";
import {
  useJenisPemeriksaanList,
  useStatusRekomendasiList,
  useSuratTemplates,
} from "@/features/master-data/hooks/use-master-data";
import type {
  JenisPemeriksaan,
  StatusRekomendasi,
  SuratTemplate,
} from "@/features/master-data/types";
import { JenisPemeriksaanTable } from "./jenis-pemeriksaan-table";
import { JenisPemeriksaanModal } from "./jenis-pemeriksaan-modal";
import { StatusRekomendasiTable } from "./status-rekomendasi-table";
import { StatusRekomendasiModal } from "./status-rekomendasi-modal";
import { SuratTemplateTable } from "./surat-template-table";
import { SuratTemplateModal } from "./surat-template-modal";
import { SuratTemplatePreviewModal } from "./surat-template-preview-modal";

export function MasterDataView() {
  const [activeTab, setActiveTab] = useState<"jenis" | "status" | "template">("jenis");

  // Filter jenis surat untuk tab template
  const [selectedJenisSurat, setSelectedJenisSurat] = useState<string>("ALL");

  // State Modals
  const [isAddJenisOpen, setIsAddJenisOpen] = useState(false);
  const [editingJenis, setEditingJenis] = useState<JenisPemeriksaan | null>(null);

  const [isAddStatusOpen, setIsAddStatusOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusRekomendasi | null>(null);

  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SuratTemplate | null>(null);
  const [previewingTemplate, setPreviewingTemplate] = useState<SuratTemplate | null>(null);

  // Queries
  const { data: jenisList = [], isLoading: isJenisLoading } = useJenisPemeriksaanList(false);
  const { data: statusList = [], isLoading: isStatusLoading } = useStatusRekomendasiList(false);
  const { data: templateList = [], isLoading: isTemplateLoading } = useSuratTemplates(
    selectedJenisSurat === "ALL" ? undefined : selectedJenisSurat,
  );

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="eyebrow">Administrasi Referensi</span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Master Data SIPATUH
          </h1>
          <p className="mt-1 text-sm text-muted">
            Konfigurasi jenis pengawasan, taksonomi status tindak lanjut, dan template surat berversi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "jenis" && (
            <button
              type="button"
              onClick={() => setIsAddJenisOpen(true)}
              className="button-primary flex items-center gap-2 text-xs sm:text-sm shadow-xs"
            >
              <Plus size={16} />
              <span>Tambah Jenis Pemeriksaan</span>
            </button>
          )}

          {activeTab === "status" && (
            <button
              type="button"
              onClick={() => setIsAddStatusOpen(true)}
              className="button-primary flex items-center gap-2 text-xs sm:text-sm shadow-xs"
            >
              <Plus size={16} />
              <span>Tambah Status Rekomendasi</span>
            </button>
          )}

          {activeTab === "template" && (
            <button
              type="button"
              onClick={() => setIsAddTemplateOpen(true)}
              className="button-primary flex items-center gap-2 text-xs sm:text-sm shadow-xs"
            >
              <Plus size={16} />
              <span>Tambah Template Surat</span>
            </button>
          )}
        </div>
      </section>

      {/* Navigasi Tab */}
      <div className="flex border-b border-line gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("jenis")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "jenis"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <ClipboardList size={16} />
          <span>Jenis Pemeriksaan</span>
          <span className="rounded-full bg-line/60 px-2 py-0.5 text-xs text-ink font-bold">
            {jenisList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("status")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "status"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <ListOrdered size={16} />
          <span>Status Rekomendasi</span>
          <span className="rounded-full bg-line/60 px-2 py-0.5 text-xs text-ink font-bold">
            {statusList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("template")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "template"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <FileCode size={16} />
          <span>Template Surat (SP)</span>
          <span className="rounded-full bg-line/60 px-2 py-0.5 text-xs text-ink font-bold">
            {templateList.length}
          </span>
        </button>
      </div>

      {/* Konten Tab Aktif */}
      {activeTab === "jenis" && (
        <JenisPemeriksaanTable
          items={jenisList}
          isLoading={isJenisLoading}
          onAdd={() => setIsAddJenisOpen(true)}
          onEdit={(item) => setEditingJenis(item)}
        />
      )}

      {activeTab === "status" && (
        <StatusRekomendasiTable
          items={statusList}
          isLoading={isStatusLoading}
          onAdd={() => setIsAddStatusOpen(true)}
          onEdit={(item) => setEditingStatus(item)}
        />
      )}

      {activeTab === "template" && (
        <SuratTemplateTable
          templates={templateList}
          isLoading={isTemplateLoading}
          selectedJenisSurat={selectedJenisSurat}
          onJenisSuratChange={setSelectedJenisSurat}
          onAdd={() => setIsAddTemplateOpen(true)}
          onEdit={(tpl) => setEditingTemplate(tpl)}
          onPreview={(tpl) => setPreviewingTemplate(tpl)}
        />
      )}

      {/* Modals Jenis Pemeriksaan */}
      <JenisPemeriksaanModal
        item={null}
        isOpen={isAddJenisOpen}
        onClose={() => setIsAddJenisOpen(false)}
      />
      <JenisPemeriksaanModal
        item={editingJenis}
        isOpen={!!editingJenis}
        onClose={() => setEditingJenis(null)}
      />

      {/* Modals Status Rekomendasi */}
      <StatusRekomendasiModal
        item={null}
        isOpen={isAddStatusOpen}
        onClose={() => setIsAddStatusOpen(false)}
      />
      <StatusRekomendasiModal
        item={editingStatus}
        isOpen={!!editingStatus}
        onClose={() => setEditingStatus(null)}
      />

      {/* Modals Template Surat */}
      <SuratTemplateModal
        template={null}
        isOpen={isAddTemplateOpen}
        onClose={() => setIsAddTemplateOpen(false)}
      />
      <SuratTemplateModal
        template={editingTemplate}
        isOpen={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
      />
      <SuratTemplatePreviewModal
        template={previewingTemplate}
        isOpen={!!previewingTemplate}
        onClose={() => setPreviewingTemplate(null)}
      />
    </div>
  );
}
