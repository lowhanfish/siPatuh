"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FileCheck2,
  FileText,
  Lock,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useSession } from "@/features/auth/hooks/use-auth";
import { useJenisPemeriksaanList } from "@/features/master-data/hooks/use-master-data";
import { useSimpegUnitKerja } from "@/features/unit-kerja/hooks/use-unit-kerja";
import { useIrbans } from "@/features/users/hooks/use-irbans";
import { useLhpList } from "../hooks/use-lhp";
import { downloadLhpFileRequest } from "../api/lhp-api";
import type { LhpListItem, LhpStatusFilter } from "../types";
import type { AssignedIrban } from "@/features/unit-kerja/types";
import { LhpTable } from "./lhp-table";
import { LhpCreateModal } from "./lhp-create-modal";
import { LhpEditModal } from "./lhp-edit-modal";
import { LhpDetailModal } from "./lhp-detail-modal";
import { LhpCloseModal } from "./lhp-close-modal";
import { LhpReopenModal } from "./lhp-reopen-modal";
import { getApiErrorMessage } from "@/lib/api-client";

export function LhpManagementView() {
  const { data: user = null } = useSession();

  // Filter States
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number | undefined>(currentYear);
  const [selectedStatus, setSelectedStatus] = useState<LhpStatusFilter>("ALL");
  const [selectedJenisPemeriksaan, setSelectedJenisPemeriksaan] = useState<string>("");
  const [selectedIrbanId, setSelectedIrbanId] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const limit = 10;

  // Master Data Queries
  const { data: rawIrbans = [] } = useIrbans();
  const irbans: AssignedIrban[] = useMemo(
    () =>
      rawIrbans.map((i) => ({
        id: i.id,
        kode: i.kode,
        nama: i.nama,
      })),
    [rawIrbans],
  );

  const { data: jenisList = [] } = useJenisPemeriksaanList(false);
  const { data: simpegUnits = [] } = useSimpegUnitKerja();

  // LHP Query
  const {
    data: lhpResponse,
    isLoading: isLhpLoading,
    refetch,
    isFetching,
  } = useLhpList({
    tahun: selectedYear,
    status: selectedStatus,
    jenis_pemeriksaan_id: selectedJenisPemeriksaan || undefined,
    irban_id: selectedIrbanId || undefined,
    search: search || undefined,
    page,
    limit,
  });

  const lhpItems = lhpResponse?.data || [];
  const meta = lhpResponse?.meta || {
    total: 0,
    page: 1,
    limit: 10,
    total_pages: 1,
    tahun: currentYear,
  };

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLhp, setEditingLhp] = useState<LhpListItem | null>(null);
  const [detailLhpId, setDetailLhpId] = useState<string | null>(null);
  const [closingLhp, setClosingLhp] = useState<LhpListItem | null>(null);
  const [reopeningLhp, setReopeningLhp] = useState<LhpListItem | null>(null);

  async function handleDownloadFile(lhp: LhpListItem) {
    if (!lhp.file_path) {
      toast.error("Berkas LHP fisik belum tersedia untuk diunduh.");
      return;
    }
    try {
      await downloadLhpFileRequest(lhp.id, lhp.nomor_lhp);
      toast.success(`Mengunduh berkas LHP ${lhp.nomor_lhp}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  // Hitung statistik ringkas dari list yang tampil
  const openCount = lhpItems.filter((i) => !i.is_closed).length;
  const closedCount = lhpItems.filter((i) => i.is_closed).length;

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="eyebrow">Pengawasan Pemeriksaan</span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Laporan Hasil Pemeriksaan (LHP)
          </h1>
          <p className="mt-1 text-sm text-muted">
            Pencatatan, pengawasan berkas naskah dinas, dan pemantauan tindak lanjut rekomendasi per wilayah Irban.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-muted hover:text-ink transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Segarkan daftar data LHP"
          >
            <RefreshCw
              size={14}
              className={isFetching ? "animate-spin text-brand" : ""}
            />
            <span>Segarkan</span>
          </button>

          {(user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_IRBAN") && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="button-primary flex items-center gap-2 text-xs sm:text-sm shadow-xs"
            >
              <Plus size={16} />
              <span>Tambah LHP Baru</span>
            </button>
          )}
        </div>
      </section>

      {/* Kartu Ringkasan Status Cepat */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-card flex items-center justify-between">
          <div>
            <span className="text-2xs font-semibold text-muted uppercase tracking-wider">
              Total LHP Terdaftar
            </span>
            <p className="mt-1 text-2xl font-bold text-ink">{meta.total}</p>
          </div>
          <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand">
            <FileText size={20} />
          </span>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-card flex items-center justify-between">
          <div>
            <span className="text-2xs font-semibold text-emerald-800 uppercase tracking-wider">
              Dalam Pemantauan (Aktif)
            </span>
            <p className="mt-1 text-2xl font-bold text-emerald-950">
              {openCount}{" "}
              <span className="text-xs font-normal text-emerald-800">
                (di halaman ini)
              </span>
            </p>
          </div>
          <span className="grid size-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
            <FileCheck2 size={20} />
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-card flex items-center justify-between">
          <div>
            <span className="text-2xs font-semibold text-slate-700 uppercase tracking-wider">
              Telah Ditandai Selesai
            </span>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {closedCount}{" "}
              <span className="text-xs font-normal text-slate-700">
                (di halaman ini)
              </span>
            </p>
          </div>
          <span className="grid size-10 place-items-center rounded-2xl bg-slate-200 text-slate-700">
            <Lock size={20} />
          </span>
        </div>
      </div>

      {/* Tabel Utama LHP */}
      <LhpTable
        items={lhpItems}
        isLoading={isLhpLoading}
        total={meta.total}
        currentPage={page}
        totalPages={meta.total_pages}
        onPageChange={setPage}
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        selectedYear={selectedYear}
        onYearChange={(val) => {
          setSelectedYear(val);
          setPage(1);
        }}
        selectedStatus={selectedStatus}
        onStatusChange={(val) => {
          setSelectedStatus(val);
          setPage(1);
        }}
        selectedJenisPemeriksaan={selectedJenisPemeriksaan}
        onJenisPemeriksaanChange={(val) => {
          setSelectedJenisPemeriksaan(val);
          setPage(1);
        }}
        selectedIrbanId={selectedIrbanId}
        onIrbanChange={(val) => {
          setSelectedIrbanId(val);
          setPage(1);
        }}
        jenisOptions={jenisList}
        irbanOptions={irbans}
        currentUser={user}
        onAddLhp={() => setIsCreateOpen(true)}
        onViewDetail={(lhp) => setDetailLhpId(lhp.id)}
        onDownloadFile={handleDownloadFile}
        onCloseLhp={(lhp) => setClosingLhp(lhp)}
        onReopenLhp={(lhp) => setReopeningLhp(lhp)}
      />

      {/* Modal Tambah LHP Baru */}
      <LhpCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        units={simpegUnits}
        jenisList={jenisList}
        currentUser={user}
        onSuccess={() => refetch()}
      />

      {/* Modal Ubah Metadata LHP */}
      <LhpEditModal
        lhp={editingLhp}
        isOpen={!!editingLhp}
        onClose={() => setEditingLhp(null)}
        jenisList={jenisList}
        onSuccess={() => refetch()}
      />

      {/* Modal Rincian Detail LHP */}
      <LhpDetailModal
        lhpId={detailLhpId}
        isOpen={!!detailLhpId}
        onClose={() => setDetailLhpId(null)}
        currentUser={user}
        onEdit={(lhp) => setEditingLhp(lhp)}
        onCloseLhp={(lhp) => setClosingLhp(lhp)}
        onReopenLhp={(lhp) => setReopeningLhp(lhp)}
      />

      {/* Modal Konfirmasi Close LHP (Tandai Selesai) */}
      <LhpCloseModal
        lhp={closingLhp}
        isOpen={!!closingLhp}
        onClose={() => setClosingLhp(null)}
        onSuccess={() => refetch()}
      />

      {/* Modal Konfirmasi Reopen LHP (Buka Kembali oleh Super Admin) */}
      <LhpReopenModal
        lhp={reopeningLhp}
        isOpen={!!reopeningLhp}
        onClose={() => setReopeningLhp(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
