"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Building2, CheckCircle2, Loader2, UserCog, X } from "lucide-react";
import type { Irban, Role, SipatuhUser } from "@/features/users/types";
import { useUpdateUser } from "@/features/users/hooks/use-users";
import { getApiErrorMessage } from "@/lib/api-client";

type EditUserModalProps = {
  user: SipatuhUser | null;
  isOpen: boolean;
  onClose: () => void;
  irbans: Irban[];
};

export function EditUserModal({
  user,
  isOpen,
  onClose,
  irbans,
}: EditUserModalProps) {
  if (!isOpen || !user) return null;
  return <EditUserModalContent user={user} onClose={onClose} irbans={irbans} />;
}

function EditUserModalContent({
  user,
  onClose,
  irbans,
}: {
  user: SipatuhUser;
  onClose: () => void;
  irbans: Irban[];
}) {
  const [role, setRole] = useState<Role>(user.role);
  const [irbanId, setIrbanId] = useState<string>(
    user.irban_id || (irbans.length > 0 ? irbans[0].id : ""),
  );
  const [formError, setFormError] = useState<string | null>(null);

  const updateMutation = useUpdateUser();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (role === "ADMIN_IRBAN" && !irbanId) {
      setFormError("Admin Irban wajib memilih satu wilayah Irban penugasan.");
      return;
    }

    try {
      setFormError(null);
      await updateMutation.mutateAsync({
        id: user.id,
        input: {
          role,
          irban_id: role === "ADMIN_IRBAN" ? irbanId : null,
        },
      });

      toast.success(
        `Hak akses pengguna ${user.identity?.nama || user.identity?.username || user.id} berhasil diperbarui.`,
      );
      onClose();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-3xl border border-line bg-surface p-6 shadow-panel sm:p-8">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand">
              <UserCog aria-hidden size={20} />
            </span>
            <div>
              <h2 id="edit-modal-title" className="text-lg font-bold text-ink sm:text-xl">
                Ubah Hak Akses Pengguna
              </h2>
              <p className="text-xs text-muted">
                Perbarui peran sistem atau pindah penugasan wilayah Irban
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

        <div className="mt-4 rounded-xl border border-line bg-canvas/40 p-3.5 text-xs space-y-1">
          <p className="font-bold text-ink">
            {user.identity?.nama || user.identity?.username}
          </p>
          <p className="text-muted">
            @{user.identity?.username} • NIP: {user.identity?.nip || "-"}
          </p>
          {user.identity?.unit_kerja && (
            <p className="text-muted">Unit: {user.identity.unit_kerja}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Pemilihan Role */}
          <div className="space-y-1.5">
            <label htmlFor="edit-role" className="form-label text-xs">
              Peran Pengguna (Role) *
            </label>
            <select
              id="edit-role"
              value={role}
              onChange={(e) => {
                const val = e.target.value as Role;
                setRole(val);
                setFormError(null);
              }}
              className="form-input text-xs sm:text-sm cursor-pointer"
            >
              <option value="ADMIN_IRBAN">ADMIN_IRBAN (Pengelola Operasional Wilayah Irban)</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN (Inspektur / Administrator Utama)</option>
              <option value="BUPATI">BUPATI (Pimpinan Eksekutif / Read-Only)</option>
            </select>
          </div>

          {/* Pemilihan Wilayah Irban */}
          {role === "ADMIN_IRBAN" && (
            <div className="space-y-1.5">
              <label htmlFor="edit-irban" className="form-label text-xs">
                Penugasan Wilayah Irban *
              </label>
              <div className="relative">
                <Building2
                  aria-hidden
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                  size={16}
                />
                <select
                  id="edit-irban"
                  value={irbanId}
                  onChange={(e) => {
                    setIrbanId(e.target.value);
                    setFormError(null);
                  }}
                  className="form-input pl-10 text-xs sm:text-sm cursor-pointer"
                  required
                >
                  <option value="">-- Pilih Wilayah Irban --</option>
                  {irbans.map((irb, idx) => (
                    <option key={irb.id || `irban-${idx}`} value={irb.id}>
                      {irb.nama} ({irb.kode})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-line/60 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-semibold text-muted hover:text-ink transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="button-primary text-xs sm:text-sm flex items-center gap-1.5"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 aria-hidden className="animate-spin" size={14} />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
