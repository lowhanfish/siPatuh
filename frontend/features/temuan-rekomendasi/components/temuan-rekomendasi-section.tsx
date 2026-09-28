"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Coins,
  Edit2,
  FileCheck2,
  FileText,
  Layers,
  ListOrdered,
  Loader2,
  Lock,
  Plus,
  Trash2,
  History,
} from "lucide-react";
import type { RekomendasiItem, TemuanItem } from "../types";
import type { AuthUser } from "@/features/auth/types";
import {
  useDeleteRekomendasi,
  useDeleteTemuan,
  useTemuanList,
} from "../hooks/use-temuan-rekomendasi";
import { useStatusRekomendasiList } from "@/features/master-data/hooks/use-master-data";
import { formatRupiah } from "@/features/dashboard/utils/formatters";
import { TemuanModal } from "./temuan-modal";
import { RekomendasiModal } from "./rekomendasi-modal";
import { DeleteConfirmModal } from "./delete-confirm-modal";
import { TindakLanjutDrawer } from "@/features/tindak-lanjut/components/tindak-lanjut-drawer";
import { getApiErrorMessage } from "@/lib/api-client";

type TemuanRekomendasiSectionProps = {
  lhpId: string;
  isClosed: boolean;
  currentUser: AuthUser | null;
};

export function TemuanRekomendasiSection({
  lhpId,
  isClosed,
  currentUser,
}: TemuanRekomendasiSectionProps) {
  const { data: temuans = [], isLoading, error } = useTemuanList(lhpId);
  const { data: statusList = [] } = useStatusRekomendasiList(false);

  // Expanded accordion states per temuan ID
  const [expandedTemuanIds, setExpandedTemuanIds] = useState<Record<string, boolean>>({});

  // Modal States
  const [isAddTemuanOpen, setIsAddTemuanOpen] = useState(false);
  const [editingTemuan, setEditingTemuan] = useState<TemuanItem | null>(null);

  const [addingRekomendasiToTemuan, setAddingRekomendasiToTemuan] =
    useState<TemuanItem | null>(null);
  const [editingRekomendasi, setEditingRekomendasi] = useState<{
    temuan: TemuanItem;
    rekomendasi: RekomendasiItem;
  } | null>(null);

  const [activeRekomendasiTl, setActiveRekomendasiTl] = useState<{
    temuan: TemuanItem;
    rekomendasi: RekomendasiItem;
  } | null>(null);

  // Delete Confirm States
  const [deletingTemuan, setDeletingTemuan] = useState<TemuanItem | null>(null);
  const [deletingRekomendasi, setDeletingRekomendasi] =
    useState<RekomendasiItem | null>(null);

  const deleteTemuanMutation = useDeleteTemuan(lhpId);
  const deleteRekomendasiMutation = useDeleteRekomendasi(lhpId);

  const canMutate =
    (currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ADMIN_IRBAN") &&
    !isClosed;

  // Toggle satu temuan
  function toggleExpand(id: string) {
    setExpandedTemuanIds((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  }

  // Buka semua / Tutup semua
  function expandAll() {
    const next: Record<string, boolean> = {};
    for (const t of temuans) {
      next[t.id] = true;
    }
    setExpandedTemuanIds(next);
  }

  function collapseAll() {
    const next: Record<string, boolean> = {};
    for (const t of temuans) {
      next[t.id] = false;
    }
    setExpandedTemuanIds(next);
  }

  // Hitung akumulasi statistik
  const totalRekomendasi = useMemo(() => {
    return temuans.reduce((acc, t) => acc + (t.rekomendasis?.length || 0), 0);
  }, [temuans]);

  const totalNilaiTemuan = useMemo(() => {
    return temuans.reduce((acc, t) => {
      const val = parseFloat(String(t.nilai_temuan || 0));
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [temuans]);

  const totalNilaiRekomendasi = useMemo(() => {
    return temuans.reduce((acc, t) => {
      const sub = (t.rekomendasis || []).reduce((subAcc, r) => {
        const val = parseFloat(String(r.nilai_rekomendasi || 0));
        return subAcc + (isNaN(val) ? 0 : val);
      }, 0);
      return acc + sub;
    }, 0);
  }, [temuans]);

  async function handleConfirmDeleteTemuan() {
    if (!deletingTemuan) return;
    try {
      await deleteTemuanMutation.mutateAsync(deletingTemuan.id);
      toast.success(`Temuan #${deletingTemuan.nomor_urut} berhasil dihapus.`);
      setDeletingTemuan(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleConfirmDeleteRekomendasi() {
    if (!deletingRekomendasi) return;
    try {
      await deleteRekomendasiMutation.mutateAsync(deletingRekomendasi.id);
      toast.success(
        `Rekomendasi #${deletingRekomendasi.nomor_urut} berhasil dihapus.`,
      );
      setDeletingRekomendasi(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Bagian & Statistik Akumulasi */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="eyebrow">Daftar Hasil Pengawasan</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-2xs font-bold text-blue-700">
              <Layers size={11} />
              Hierarki Bertingkat
            </span>
          </div>
          <h3 className="text-base font-bold text-ink sm:text-lg">
            Temuan ({temuans.length}) & Rekomendasi ({totalRekomendasi})
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {temuans.length > 0 && (
            <div className="flex items-center gap-1.5 text-2xs">
              <button
                type="button"
                onClick={expandAll}
                className="rounded-lg border border-line bg-surface px-2.5 py-1 font-semibold text-muted hover:text-ink transition-colors cursor-pointer"
              >
                Buka Semua
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="rounded-lg border border-line bg-surface px-2.5 py-1 font-semibold text-muted hover:text-ink transition-colors cursor-pointer"
              >
                Tutup Semua
              </button>
            </div>
          )}

          {canMutate && (
            <button
              type="button"
              onClick={() => setIsAddTemuanOpen(true)}
              className="button-primary text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={14} />
              <span>Tambah Temuan</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner Rekap Nilai Finansial jika terisi */}
      {(totalNilaiTemuan > 0 || totalNilaiRekomendasi > 0) && (
        <div className="grid gap-3 sm:grid-cols-2 rounded-2xl border border-line bg-canvas/40 p-3.5 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <Coins size={16} />
            </span>
            <div>
              <span className="text-2xs text-muted font-medium">
                Total Kerugian / Temuan Finansial:
              </span>
              <p className="font-bold text-ink text-sm">
                {formatRupiah(totalNilaiTemuan)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <Coins size={16} />
            </span>
            <div>
              <span className="text-2xs text-muted font-medium">
                Total Rekomendasi Pemulihan / Setor Kas:
              </span>
              <p className="font-bold text-emerald-800 text-sm">
                {formatRupiah(totalNilaiRekomendasi)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner jika LHP sudah ditutup */}
      {isClosed && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-2xs text-slate-700">
          <Lock size={13} className="shrink-0 text-slate-500" />
          <span>
            LHP telah ditandai selesai (closed). Pengelolaan Temuan dan Rekomendasi berstatus terkunci (read-only).
          </span>
        </div>
      )}

      {/* Konten Daftar Temuan */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-line bg-surface">
          <Loader2 className="animate-spin text-brand" size={28} />
          <p className="mt-2 text-xs text-muted">Memuat temuan dan rekomendasi...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-xs text-rose-800">
          <AlertCircle className="mx-auto size-6 text-rose-600 mb-1" />
          <p className="font-bold">Gagal Mengambil Data Temuan</p>
          <p className="mt-0.5 text-2xs">{getApiErrorMessage(error)}</p>
        </div>
      ) : temuans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center shadow-card">
          <FileText className="mx-auto size-10 text-muted" />
          <h4 className="mt-3 text-sm font-bold text-ink">Belum Ada Temuan</h4>
          <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
            {canMutate
              ? "Klik 'Tambah Temuan' di atas untuk mencatat temuan pemeriksaan pertama pada LHP ini."
              : "LHP ini belum memiliki data temuan pemeriksaan."}
          </p>
          {canMutate && (
            <button
              type="button"
              onClick={() => setIsAddTemuanOpen(true)}
              className="button-primary text-xs mt-4 inline-flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={14} />
              <span>Tambah Temuan Pertama</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {temuans.map((temuan) => {
            const isExpanded = expandedTemuanIds[temuan.id] ?? true; // default terbuka
            const rekomCount = temuan.rekomendasis?.length || 0;
            const numericTemuanVal = parseFloat(String(temuan.nilai_temuan || 0));

            return (
              <div
                key={temuan.id}
                className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all"
              >
                {/* Header Kartu Temuan (Accordion Bar) */}
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 bg-canvas/30">
                  <div
                    onClick={() => toggleExpand(temuan.id)}
                    className="flex flex-1 items-start gap-3 cursor-pointer select-none"
                  >
                    <span className="mt-0.5 text-muted hover:text-ink transition-colors">
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </span>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-brand-soft px-2 py-0.5 text-2xs font-extrabold text-brand border border-brand/20">
                          Temuan #{temuan.nomor_urut}
                        </span>

                        <span className="rounded-md bg-line/80 px-2 py-0.5 text-2xs font-bold text-ink">
                          {rekomCount} Rekomendasi
                        </span>

                        {!isNaN(numericTemuanVal) && numericTemuanVal > 0 && (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-2xs font-bold text-amber-800 border border-amber-200">
                            {formatRupiah(numericTemuanVal)}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-ink sm:text-base leading-snug">
                        {temuan.judul}
                      </h4>
                    </div>
                  </div>

                  {/* Aksi Temuan */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    {canMutate && (
                      <button
                        type="button"
                        onClick={() => setAddingRekomendasiToTemuan(temuan)}
                        className="inline-flex items-center gap-1 rounded-xl bg-brand-soft hover:bg-brand/15 px-2.5 py-1 text-2xs font-bold text-brand shadow-xs transition-colors cursor-pointer"
                        title="Tambah rekomendasi di bawah temuan ini"
                      >
                        <Plus size={13} />
                        <span>Rekomendasi</span>
                      </button>
                    )}

                    {canMutate && (
                      <button
                        type="button"
                        onClick={() => setEditingTemuan(temuan)}
                        className="rounded-xl border border-line bg-surface p-1.5 text-muted hover:text-brand hover:border-brand transition-colors cursor-pointer"
                        title="Ubah judul atau uraian temuan"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}

                    {canMutate && (
                      <button
                        type="button"
                        onClick={() => setDeletingTemuan(temuan)}
                        className="rounded-xl border border-line bg-surface p-1.5 text-muted hover:text-rose-600 hover:border-rose-300 transition-colors cursor-pointer"
                        title="Hapus temuan"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Konten Terbuka (Uraian & Rekomendasi) */}
                {isExpanded && (
                  <div className="p-4 space-y-4">
                    {/* Uraian Lengkap Temuan */}
                    <div className="rounded-xl border border-line/60 bg-canvas/20 p-3 text-xs leading-relaxed text-muted">
                      <span className="block font-semibold text-ink text-2xs uppercase tracking-wider mb-1">
                        Kondisi / Uraian Temuan:
                      </span>
                      <p className="whitespace-pre-line text-ink/80">{temuan.uraian}</p>
                    </div>

                    {/* Sub-Daftar Rekomendasi di bawah Temuan */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-2xs font-bold text-muted uppercase tracking-wider">
                          <ListOrdered size={13} className="text-brand" />
                          Rekomendasi Tindak Lanjut:
                        </span>

                        {canMutate && (
                          <button
                            type="button"
                            onClick={() => setAddingRekomendasiToTemuan(temuan)}
                            className="text-2xs font-semibold text-brand hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={11} />
                            <span>Tambah Rekomendasi</span>
                          </button>
                        )}
                      </div>

                      {rekomCount === 0 ? (
                        <div className="rounded-xl border border-dashed border-line bg-canvas/30 p-4 text-center">
                          <p className="text-2xs font-semibold text-muted">
                            Belum ada rekomendasi yang ditambahkan untuk temuan ini.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {temuan.rekomendasis.map((rekom) => {
                            const numericRekomVal = parseFloat(
                              String(rekom.nilai_rekomendasi || 0),
                            );
                            const isSelesai =
                              rekom.status_rekomendasi?.kategori === "SELESAI";

                            return (
                              <div
                                key={rekom.id}
                                className="group relative rounded-xl border border-line bg-surface p-3.5 shadow-xs transition-all hover:border-brand/40"
                              >
                                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="space-y-1.5 flex-1 pr-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="rounded-md bg-canvas px-1.5 py-0.5 text-2xs font-extrabold text-ink border border-line">
                                        #{temuan.nomor_urut}.{rekom.nomor_urut}
                                      </span>

                                      {/* Badge Status Rekomendasi Dinamis */}
                                      {rekom.status_rekomendasi ? (
                                        <span
                                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold ${
                                            isSelesai
                                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                              : "bg-amber-50 text-amber-800 border border-amber-200"
                                          }`}
                                        >
                                          {isSelesai ? (
                                            <FileCheck2 size={11} />
                                          ) : (
                                            <AlertCircle size={11} />
                                          )}
                                          <span>{rekom.status_rekomendasi.nama}</span>
                                        </span>
                                      ) : (
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-2xs text-slate-600">
                                          Status Default
                                        </span>
                                      )}

                                      {/* Nominal Rekomendasi Finansial jika terisi */}
                                      {!isNaN(numericRekomVal) && numericRekomVal > 0 && (
                                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-2xs font-bold text-emerald-800 border border-emerald-200">
                                          Setor Kas: {formatRupiah(numericRekomVal)}
                                        </span>
                                      )}

                                      {/* Indikator Jumlah Tindak Lanjut yang telah tercatat */}
                                      <span className="rounded-md bg-line/60 px-2 py-0.5 text-2xs text-muted font-medium">
                                        {rekom._count?.tindak_lanjuts || 0} Tindak Lanjut
                                      </span>
                                    </div>

                                    <p className="text-xs text-ink leading-relaxed">
                                      {rekom.uraian}
                                    </p>

                                    <div className="pt-1.5 flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setActiveRekomendasiTl({
                                            temuan,
                                            rekomendasi: rekom,
                                          })
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand-soft/70 px-2.5 py-1 text-2xs font-bold text-brand hover:bg-brand hover:text-surface transition-colors cursor-pointer"
                                        title="Lihat riwayat tindak lanjut atau lakukan verifikasi"
                                      >
                                        <History size={12} />
                                        <span>Tindak Lanjut & Verifikasi ({rekom._count?.tindak_lanjuts || 0})</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Aksi Rekomendasi */}
                                  {canMutate && (
                                    <div className="flex items-center gap-1 self-end sm:self-start shrink-0">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditingRekomendasi({
                                            temuan,
                                            rekomendasi: rekom,
                                          })
                                        }
                                        className="rounded-lg border border-line bg-surface p-1 text-muted hover:text-brand hover:border-brand transition-colors cursor-pointer"
                                        title="Ubah rekomendasi"
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setDeletingRekomendasi(rekom)}
                                        className="rounded-lg border border-line bg-surface p-1 text-muted hover:text-rose-600 hover:border-rose-300 transition-colors cursor-pointer"
                                        title="Hapus rekomendasi"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah Temuan */}
      <TemuanModal
        isOpen={isAddTemuanOpen}
        onClose={() => setIsAddTemuanOpen(false)}
        lhpId={lhpId}
        temuan={null}
      />

      {/* Modal Edit Temuan */}
      <TemuanModal
        isOpen={!!editingTemuan}
        onClose={() => setEditingTemuan(null)}
        lhpId={lhpId}
        temuan={editingTemuan}
      />

      {/* Modal Tambah Rekomendasi */}
      {addingRekomendasiToTemuan && (
        <RekomendasiModal
          isOpen={!!addingRekomendasiToTemuan}
          onClose={() => setAddingRekomendasiToTemuan(null)}
          lhpId={lhpId}
          temuan={addingRekomendasiToTemuan}
          rekomendasi={null}
          statusList={statusList}
        />
      )}

      {/* Modal Edit Rekomendasi */}
      {editingRekomendasi && (
        <RekomendasiModal
          isOpen={!!editingRekomendasi}
          onClose={() => setEditingRekomendasi(null)}
          lhpId={lhpId}
          temuan={editingRekomendasi.temuan}
          rekomendasi={editingRekomendasi.rekomendasi}
          statusList={statusList}
        />
      )}

      {/* Modal Konfirmasi Hapus Temuan */}
      <DeleteConfirmModal
        isOpen={!!deletingTemuan}
        onClose={() => setDeletingTemuan(null)}
        onConfirm={handleConfirmDeleteTemuan}
        title="Hapus Temuan Pemeriksaan?"
        message={`Apakah Anda yakin ingin menghapus Temuan #${deletingTemuan?.nomor_urut}: "${deletingTemuan?.judul}" beserta seluruh rekomendasi di bawahnya? Tindakan ini akan dicatat dalam audit trail.`}
        isPending={deleteTemuanMutation.isPending}
      />

      {/* Modal Konfirmasi Hapus Rekomendasi */}
      <DeleteConfirmModal
        isOpen={!!deletingRekomendasi}
        onClose={() => setDeletingRekomendasi(null)}
        onConfirm={handleConfirmDeleteRekomendasi}
        title="Hapus Rekomendasi Tindak Lanjut?"
        message={`Apakah Anda yakin ingin menghapus Rekomendasi #${deletingRekomendasi?.nomor_urut}? Seluruh catatan tindak lanjut yang terhubung akan ikut terhapus.`}
        isPending={deleteRekomendasiMutation.isPending}
      />

      {/* Drawer / Modal Histori Tindak Lanjut & Verifikasi */}
      {activeRekomendasiTl && (
        <TindakLanjutDrawer
          isOpen={!!activeRekomendasiTl}
          onClose={() => setActiveRekomendasiTl(null)}
          lhpId={lhpId}
          isClosed={isClosed}
          temuan={activeRekomendasiTl.temuan}
          rekomendasi={activeRekomendasiTl.rekomendasi}
          statusList={statusList}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
