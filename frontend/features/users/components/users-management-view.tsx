"use client";

import { useState } from "react";
import { Building2, UserPlus, Users } from "lucide-react";
import type { Irban, SipatuhUser, UserFilterParams } from "@/features/users/types";
import { useUsers } from "@/features/users/hooks/use-users";
import { useIrbans } from "@/features/users/hooks/use-irbans";
import { UserListTable } from "./user-list-table";
import { IrbanListTable } from "./irban-list-table";
import { ActivateUserModal } from "./activate-user-modal";
import { EditUserModal } from "./edit-user-modal";
import { EditIrbanModal } from "./edit-irban-modal";

export function UsersManagementView() {
  const [activeTab, setActiveTab] = useState<"users" | "irbans">("users");
  const [filters, setFilters] = useState<UserFilterParams>({});

  const [isActivateOpen, setIsActivateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SipatuhUser | null>(null);
  const [editingIrban, setEditingIrban] = useState<Irban | null>(null);

  const { data: users = [], isLoading: isUsersLoading } = useUsers(filters);
  const { data: irbans = [], isLoading: isIrbansLoading } = useIrbans();

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="eyebrow">Administrasi Sistem</span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Pengguna & Wilayah Irban
          </h1>
          <p className="mt-1 text-sm text-muted">
            Otorisasi hak akses pengguna SIPATUH dari direktori EGOV dan penugasan wilayah Irban.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsActivateOpen(true)}
            className="button-primary flex items-center gap-2 text-xs sm:text-sm shadow-xs"
          >
            <UserPlus size={16} />
            <span>Aktivasi Akun EGOV</span>
          </button>
        </div>
      </section>

      {/* Navigasi Tab */}
      <div className="flex border-b border-line gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "users"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Users size={16} />
          <span>Pengguna SIPATUH</span>
          <span className="rounded-full bg-line/60 px-2 py-0.5 text-xs text-ink font-bold">
            {users.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("irbans")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "irbans"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Building2 size={16} />
          <span>Wilayah Kerja Irban</span>
          <span className="rounded-full bg-line/60 px-2 py-0.5 text-xs text-ink font-bold">
            {irbans.length}
          </span>
        </button>
      </div>

      {/* Konten Tab Aktif */}
      {activeTab === "users" ? (
        <UserListTable
          users={users}
          isLoading={isUsersLoading}
          filters={filters}
          onFilterChange={setFilters}
          irbans={irbans}
          onEditUser={(u) => setEditingUser(u)}
        />
      ) : (
        <IrbanListTable
          irbans={irbans}
          isLoading={isIrbansLoading}
          onEditIrban={(irb) => setEditingIrban(irb)}
        />
      )}

      {/* Modal Aktivasi Pengguna Baru dari EGOV */}
      <ActivateUserModal
        isOpen={isActivateOpen}
        onClose={() => setIsActivateOpen(false)}
        irbans={irbans}
      />

      {/* Modal Edit Hak Akses Pengguna */}
      <EditUserModal
        user={editingUser}
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        irbans={irbans}
      />

      {/* Modal Edit Detail Irban */}
      <EditIrbanModal
        irban={editingIrban}
        isOpen={!!editingIrban}
        onClose={() => setEditingIrban(null)}
      />
    </div>
  );
}
