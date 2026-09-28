import {
  Building2,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import type { LhpListItem, LhpStatusFilter } from "../types";
import type { JenisPemeriksaan } from "@/features/master-data/types";
import type { AssignedIrban } from "@/features/unit-kerja/types";
import type { AuthUser } from "@/features/auth/types";
import { formatTanggalIndo } from "@/features/dashboard/utils/formatters";

type LhpTableProps = {
  items: LhpListItem[];
  isLoading: boolean;
  total: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  // Filters
  search: string;
  onSearchChange: (search: string) => void;
  selectedYear: number | undefined;
  onYearChange: (year: number | undefined) => void;
  selectedStatus: LhpStatusFilter;
  onStatusChange: (status: LhpStatusFilter) => void;
  selectedJenisPemeriksaan: string;
  onJenisPemeriksaanChange: (jenisId: string) => void;
  selectedIrbanId: string;
  onIrbanChange: (irbanId: string) => void;
  // Master options
  jenisOptions: JenisPemeriksaan[];
  irbanOptions: AssignedIrban[];
  currentUser: AuthUser | null;
  // Actions
  onAddLhp: () => void;
  onViewDetail: (lhp: LhpListItem) => void;
  onDownloadFile: (lhp: LhpListItem) => void;
  onCloseLhp: (lhp: LhpListItem) => void;
  onReopenLhp: (lhp: LhpListItem) => void;
};

export function LhpTable({
  items,
  isLoading,
  total,
  currentPage,
  totalPages,
  onPageChange,
  search,
  onSearchChange,
  selectedYear,
  onYearChange,
  selectedStatus,
  onStatusChange,
  selectedJenisPemeriksaan,
  onJenisPemeriksaanChange,
  selectedIrbanId,
  onIrbanChange,
  jenisOptions,
  irbanOptions,
  currentUser,
  onAddLhp,
  onViewDetail,
  onDownloadFile,
  onCloseLhp,
  onReopenLhp,
}: LhpTableProps) {
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
  const canCreate = currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ADMIN_IRBAN";
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  return (
    <div className="space-y-4">
      {/* Toolbar Filter & Tambah */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Pencarian Nomor LHP */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search
              aria-hidden
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              size={15}
            />
            <input
              type="text"
              placeholder="Cari nomor LHP..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="form-input pl-9 py-1.5 text-xs sm:text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Filter size={13} />
            <span>Filter:</span>
          </div>

          {/* Filter Tahun */}
          <select
            aria-label="Filter tahun LHP"
            value={selectedYear !== undefined ? String(selectedYear) : "ALL"}
            onChange={(e) =>
              onYearChange(e.target.value === "ALL" ? undefined : Number(e.target.value))
            }
            className="rounded-xl border border-line bg-canvas/60 px-3 py-1.5 text-xs font-semibold text-ink outline-none cursor-pointer"
          >
            <option value="ALL">Semua Tahun</option>
            {yearOptions.map((yr) => (
              <option key={yr} value={String(yr)}>
                Tahun {yr} {yr === currentYear ? "(Tahun Berjalan)" : ""}
              </option>
            ))}
          </select>

          {/* Filter Status (Open / Closed) */}
          <select
            aria-label="Filter status LHP"
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value as LhpStatusFilter)}
            className="rounded-xl border border-line bg-canvas/60 px-3 py-1.5 text-xs font-semibold text-ink outline-none cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="OPEN">Dalam Pemantauan (Aktif)</option>
            <option value="CLOSED">Selesai (Ditutup)</option>
          </select>

          {/* Filter Jenis Pemeriksaan */}
          <select
            aria-label="Filter jenis pemeriksaan"
            value={selectedJenisPemeriksaan}
            onChange={(e) => onJenisPemeriksaanChange(e.target.value)}
            className="rounded-xl border border-line bg-canvas/60 px-3 py-1.5 text-xs font-semibold text-ink outline-none cursor-pointer"
          >
            <option value="">Semua Jenis Pemeriksaan</option>
            {jenisOptions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nama}
              </option>
            ))}
          </select>

          {/* Filter Irban (hanya Super Admin & Bupati) */}
          {isSuperAdmin && (
            <select
              aria-label="Filter wilayah Irban"
              value={selectedIrbanId}
              onChange={(e) => onIrbanChange(e.target.value)}
              className="rounded-xl border border-line bg-canvas/60 px-3 py-1.5 text-xs font-semibold text-ink outline-none cursor-pointer"
            >
              <option value="">Semua Irban</option>
              {irbanOptions.map((irb) => (
                <option key={irb.id} value={irb.id}>
                  {irb.nama}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Tombol Tambah LHP */}
        {canCreate && (
          <button
            type="button"
            onClick={onAddLhp}
            className="button-primary text-xs sm:text-sm flex items-center gap-1.5 shrink-0 shadow-xs"
          >
            <Plus size={15} />
            <span>Tambah LHP Baru</span>
          </button>
        )}
      </div>

      {/* Tabel LHP */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="animate-spin text-brand" size={28} />
            <p className="mt-3 text-xs text-muted">Memuat daftar LHP...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="text-muted" size={32} />
            <p className="mt-3 text-sm font-semibold text-ink">Tidak ada LHP ditemukan</p>
            <p className="mt-1 max-w-sm text-xs text-muted">
              {search || selectedYear || selectedStatus !== "ALL" || selectedJenisPemeriksaan
                ? "Tidak ada data LHP yang cocok dengan kriteria filter."
                : "Belum ada dokumen LHP terdaftar. Klik 'Tambah LHP Baru' untuk mencatat LHP pemeriksaan."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-muted">
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    Nomor LHP & OPD Sasaran
                  </th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    Wilayah & Pengawasan
                  </th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    Tanggal Terbit & Diterima
                  </th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider text-center">
                    Temuan / SP
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
                {items.map((lhp) => {
                  return (
                    <tr
                      key={lhp.id}
                      className={`transition-colors hover:bg-canvas/40 ${
                        lhp.is_closed ? "bg-canvas/20" : ""
                      }`}
                    >
                      {/* Nomor LHP & Nama OPD */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-ink sm:text-sm flex items-center gap-1.5">
                          <FileText size={15} className="text-brand shrink-0" />
                          <span>{lhp.nomor_lhp}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-2xs text-muted font-medium">
                          <Building2 size={12} className="text-muted shrink-0" />
                          <span className="truncate max-w-[240px] sm:max-w-xs text-ink font-semibold">
                            {lhp.unit_kerja_nama}
                          </span>
                        </div>
                      </td>

                      {/* Wilayah Irban & Jenis Pengawasan */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-ink">{lhp.irban.nama}</div>
                        <div className="mt-0.5 inline-block rounded-md bg-canvas px-1.5 py-0.5 text-2xs font-semibold text-muted border border-line/60">
                          {lhp.jenis_pemeriksaan.nama}
                        </div>
                      </td>

                      {/* Tanggal Terbit vs Tanggal Diterima */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1 text-2xs">
                          <div className="flex items-center gap-1 text-muted">
                            <span className="font-medium">Terbit:</span>
                            <span className="font-semibold text-ink">
                              {formatTanggalIndo(lhp.tanggal_lhp)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50/60 rounded px-1.5 py-0.5 border border-emerald-200/50 w-fit">
                            <Clock size={11} className="shrink-0" />
                            <span className="font-semibold">
                              Diterima: {formatTanggalIndo(lhp.tanggal_diterima_lhp)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Temuan & SP Count */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span
                            className="rounded-lg bg-blue-50 px-2 py-0.5 text-2xs font-bold text-blue-700 border border-blue-200/60"
                            title="Jumlah Temuan dalam LHP ini"
                          >
                            {lhp._count.temuans} Temuan
                          </span>
                          {lhp._count.surat_peringatans > 0 && (
                            <span
                              className="rounded-lg bg-amber-50 px-2 py-0.5 text-2xs font-bold text-amber-700 border border-amber-200/60"
                              title="Jumlah Surat Peringatan yang telah diterbitkan"
                            >
                              {lhp._count.surat_peringatans} SP
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status LHP (Open vs Closed) */}
                      <td className="px-4 py-3.5 text-center">
                        {lhp.is_closed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-bold text-slate-700 border border-slate-300/80">
                            <Lock size={11} />
                            Selesai (Closed)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-700 border border-emerald-200/80">
                            <CheckCircle2 size={11} />
                            Aktif (Open)
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Unduh Berkas PDF LHP jika tersedia */}
                          {lhp.file_path && (
                            <button
                              type="button"
                              onClick={() => onDownloadFile(lhp)}
                              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 font-semibold text-ink hover:border-brand hover:text-brand shadow-xs transition-colors"
                              title="Unduh Berkas PDF LHP"
                            >
                              <Download size={13} />
                              <span className="hidden sm:inline">PDF</span>
                            </button>
                          )}

                          {/* Tombol Detail LHP */}
                          <button
                            type="button"
                            onClick={() => onViewDetail(lhp)}
                            className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 font-semibold text-brand hover:border-brand shadow-xs transition-colors"
                            title="Buka rincian LHP"
                          >
                            <Eye size={13} />
                            <span>Detail</span>
                          </button>

                          {/* Tombol Tandai Selesai (jika open) */}
                          {!lhp.is_closed && canCreate && (
                            <button
                              type="button"
                              onClick={() => onCloseLhp(lhp)}
                              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 font-semibold text-slate-600 hover:border-slate-400 hover:text-ink shadow-xs transition-colors"
                              title="Tandai LHP Selesai"
                            >
                              <FileCheck size={13} />
                              <span className="hidden sm:inline">Selesai</span>
                            </button>
                          )}

                          {/* Tombol Buka Kembali (Reopen) khusus Super Admin jika closed */}
                          {lhp.is_closed && isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => onReopenLhp(lhp)}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50/50 px-2 py-1 font-semibold text-amber-800 hover:bg-amber-100 shadow-xs transition-colors"
                              title="Buka Kembali LHP"
                            >
                              <RotateCcw size={13} />
                              <span className="hidden sm:inline">Buka Kembali</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer & Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-line/60 bg-canvas/30 px-4 py-3 text-xs text-muted gap-2">
          <div>
            Menampilkan <span className="font-semibold text-ink">{items.length}</span> dari{" "}
            <span className="font-semibold text-ink">{total}</span> dokumen LHP
            {selectedYear ? ` (Tahun ${selectedYear})` : ""}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="rounded-lg border border-line bg-surface px-2.5 py-1 font-semibold text-ink disabled:opacity-40 hover:bg-canvas transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <span className="font-semibold text-ink">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="rounded-lg border border-line bg-surface px-2.5 py-1 font-semibold text-ink disabled:opacity-40 hover:bg-canvas transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Selanjutnya
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
