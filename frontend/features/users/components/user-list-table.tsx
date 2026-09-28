"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Filter,
  Loader2,
  Power,
  Search,
  UserCog,
  Users,
  XCircle,
} from "lucide-react";
import type { Irban, Role, SipatuhUser, UserFilterParams } from "@/features/users/types";
import { RoleBadge } from "./role-badge";
import { useToggleUserStatus } from "@/features/users/hooks/use-users";
import { getApiErrorMessage } from "@/lib/api-client";

type UserListTableProps = {
  users: SipatuhUser[];
  isLoading: boolean;
  filters: UserFilterParams;
  onFilterChange: (newFilters: UserFilterParams) => void;
  irbans: Irban[];
  onEditUser: (user: SipatuhUser) => void;
};

export function UserListTable({
  users,
  isLoading,
  filters,
  onFilterChange,
  irbans,
  onEditUser,
}: UserListTableProps) {
  const [toggleConfirmUser, setToggleConfirmUser] = useState<SipatuhUser | null>(null);
  const toggleMutation = useToggleUserStatus();

  async function handleConfirmToggle() {
    if (!toggleConfirmUser) return;

    try {
      const targetStatus = !toggleConfirmUser.is_active;
      await toggleMutation.mutateAsync({
        id: toggleConfirmUser.id,
        is_active: targetStatus,
      });

      toast.success(
        `Status pengguna ${toggleConfirmUser.identity?.nama || toggleConfirmUser.identity?.username} berhasil diubah menjadi ${
          targetStatus ? "Aktif" : "Nonaktif"
        }.`,
      );
      setToggleConfirmUser(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            aria-hidden
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            size={16}
          />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, NIP, atau username..."
            value={filters.search || ""}
            onChange={(e) =>
              onFilterChange({ ...filters, search: e.target.value || undefined })
            }
            className="form-input pl-10 text-xs sm:text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1 text-xs font-semibold text-muted">
            <Filter size={13} />
            Filter:
          </span>

          {/* Filter Role */}
          <select
            aria-label="Filter berdasarkan peran pengguna"
            value={filters.role || ""}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                role: (e.target.value as Role) || undefined,
              })
            }
            className="rounded-xl border border-line bg-canvas/60 px-3 py-2 text-xs font-semibold text-ink outline-none cursor-pointer"
          >
            <option value="">Semua Peran</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN_IRBAN">Admin Irban</option>
            <option value="BUPATI">Bupati</option>
          </select>

          {/* Filter Irban */}
          <select
            aria-label="Filter berdasarkan wilayah Irban"
            value={filters.irban_id || ""}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                irban_id: e.target.value || undefined,
              })
            }
            className="rounded-xl border border-line bg-canvas/60 px-3 py-2 text-xs font-semibold text-ink outline-none cursor-pointer"
          >
            <option value="">Semua Irban</option>
            {irbans.map((irb) => (
              <option key={irb.id} value={irb.id}>
                {irb.nama}
              </option>
            ))}
          </select>

          {/* Filter Status Aktif */}
          <select
            aria-label="Filter berdasarkan status akun"
            value={
              filters.is_active === undefined
                ? ""
                : filters.is_active
                  ? "true"
                  : "false"
            }
            onChange={(e) => {
              const val = e.target.value;
              onFilterChange({
                ...filters,
                is_active: val === "" ? undefined : val === "true",
              });
            }}
            className="rounded-xl border border-line bg-canvas/60 px-3 py-2 text-xs font-semibold text-ink outline-none cursor-pointer"
          >
            <option value="">Semua Status</option>
            <option value="true">Hanya Aktif</option>
            <option value="false">Hanya Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Tabel Pengguna */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="animate-spin text-brand" size={28} />
            <p className="mt-3 text-xs text-muted">Memuat daftar pengguna SIPATUH...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-canvas text-muted">
              <Users size={24} />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">Tidak ada pengguna ditemukan</p>
            <p className="mt-1 max-w-sm text-xs text-muted">
              Coba sesuaikan kata kunci pencarian atau ubah pengaturan filter di atas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-muted">
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    Pengguna (EGOV)
                  </th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    Unit Kerja Asal
                  </th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    Peran SIPATUH
                  </th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">
                    Penugasan Irban
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
                {users.map((u) => {
                  const identity = u.identity;
                  return (
                    <tr
                      key={u.id}
                      className="transition-colors hover:bg-canvas/40"
                    >
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <p className="font-bold text-ink sm:text-sm">
                            {identity?.nama || identity?.username || "Pengguna SIPATUH"}
                          </p>
                          <p className="text-muted">
                            @{identity?.username || u.egov_user_id}
                            {identity?.nip ? ` • NIP: ${identity.nip}` : ""}
                          </p>
                          {identity?.email && (
                            <p className="text-muted/80">{identity.email}</p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-medium text-ink">
                          {identity?.unit_kerja || identity?.instansi || "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <RoleBadge role={u.role} />
                      </td>

                      <td className="px-4 py-3.5">
                        {u.role === "ADMIN_IRBAN" ? (
                          u.irban ? (
                            <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                              <Building2 size={13} className="text-brand" />
                              {u.irban.nama}
                            </span>
                          ) : (
                            <span className="font-medium text-rose-700">
                              Belum Ditugaskan
                            </span>
                          )
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700">
                            <CheckCircle2 size={12} />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 font-semibold text-rose-700">
                            <XCircle size={12} />
                            Nonaktif
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditUser(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 font-semibold text-ink hover:border-brand hover:text-brand shadow-xs transition-colors"
                            title="Ubah peran atau wilayah Irban"
                          >
                            <UserCog size={13} />
                            <span>Ubah</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setToggleConfirmUser(u)}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-semibold shadow-xs transition-colors ${
                              u.is_active
                                ? "border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100"
                                : "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                            title={u.is_active ? "Nonaktifkan akun" : "Aktifkan akun"}
                          >
                            <Power size={13} />
                            <span>{u.is_active ? "Nonaktifkan" : "Aktifkan"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-line/60 bg-canvas/30 px-4 py-3 text-xs text-muted">
          <span>Menampilkan {users.length} akun terdaftar di SIPATUH</span>
          <span>Perubahan status diaudit otomatis</span>
        </div>
      </div>

      {/* Modal Konfirmasi Nonaktif / Aktif */}
      {toggleConfirmUser && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 backdrop-blur-xs p-4 sm:p-6"
        >
          <div className="flex min-h-full items-start sm:items-center justify-center py-4 sm:py-8">
            <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 shadow-panel my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col">
              <div className="flex items-center gap-3">
                <span
                  className={`grid size-10 place-items-center rounded-2xl ${
                    toggleConfirmUser.is_active
                      ? "bg-rose-50 text-rose-600"
                      : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  <AlertTriangle size={20} />
                </span>
                <h3 className="text-base font-bold text-ink">
                  {toggleConfirmUser.is_active ? "Nonaktifkan Pengguna?" : "Aktifkan Pengguna?"}
                </h3>
              </div>

              <p className="mt-3 text-xs text-muted leading-relaxed">
                Apakah Anda yakin ingin{" "}
                <strong>
                  {toggleConfirmUser.is_active ? "menonaktifkan" : "mengaktifkan kembali"}
                </strong>{" "}
                akses akun{" "}
                <span className="font-semibold text-ink">
                  {toggleConfirmUser.identity?.nama || toggleConfirmUser.identity?.username}
                </span>
                ? Akun di EGOV tetap aman dan tidak terpengaruh.
              </p>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setToggleConfirmUser(null)}
                  className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-muted hover:text-ink transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmToggle}
                  disabled={toggleMutation.isPending}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-1.5 ${
                    toggleConfirmUser.is_active
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {toggleMutation.isPending ? (
                    <>
                      <Loader2 aria-hidden className="animate-spin" size={13} />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>
                      Ya, {toggleConfirmUser.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
