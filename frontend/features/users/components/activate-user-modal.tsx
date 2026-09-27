"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Loader2,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import type { EgovCandidateUser, Irban, Role } from "@/features/users/types";
import { searchEgovUsers } from "@/features/users/api/users-api";
import { useActivateUser } from "@/features/users/hooks/use-users";
import { getApiErrorMessage } from "@/lib/api-client";

type ActivateUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  irbans: Irban[];
};

export function ActivateUserModal({
  isOpen,
  onClose,
  irbans,
}: ActivateUserModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [candidates, setCandidates] = useState<EgovCandidateUser[]>([]);
  const [searchDone, setSearchDone] = useState(false);

  const [selectedCandidate, setSelectedCandidate] = useState<EgovCandidateUser | null>(null);
  const [role, setRole] = useState<Role>("ADMIN_IRBAN");
  const [irbanId, setIrbanId] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  const activateMutation = useActivateUser();

  if (!isOpen) return null;

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setFormError(null);
      const results = await searchEgovUsers(searchQuery);
      setCandidates(results);
      setSearchDone(true);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setIsSearching(false);
    }
  }

  function handleSelectCandidate(candidate: EgovCandidateUser) {
    if (candidate.is_registered) return;
    setSelectedCandidate(candidate);
    setFormError(null);
    if (irbans.length > 0) {
      setIrbanId(irbans[0].id);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCandidate) return;

    if (role === "ADMIN_IRBAN" && !irbanId) {
      setFormError("Admin Irban wajib ditugaskan ke salah satu wilayah Irban.");
      return;
    }

    try {
      setFormError(null);
      await activateMutation.mutateAsync({
        egov_user_id: selectedCandidate.egov_user_id || selectedCandidate.id,
        role,
        irban_id: role === "ADMIN_IRBAN" ? irbanId : null,
      });

      toast.success(
        `Pengguna ${selectedCandidate.nama || selectedCandidate.username} berhasil diaktifkan di SIPATUH.`,
      );
      handleClose();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    }
  }

  function handleClose() {
    setSearchQuery("");
    setCandidates([]);
    setSearchDone(false);
    setSelectedCandidate(null);
    setRole("ADMIN_IRBAN");
    setIrbanId("");
    setFormError(null);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs"
    >
      <div className="w-full max-w-2xl rounded-3xl border border-line bg-surface p-6 shadow-panel sm:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand">
              <UserPlus aria-hidden size={20} />
            </span>
            <div>
              <h2 id="modal-title" className="text-lg font-bold text-ink sm:text-xl">
                Aktivasi Pengguna dari EGOV
              </h2>
              <p className="text-xs text-muted">
                Pilih akun ASN dari EGOV untuk diberikan hak akses ke SIPATUH
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="grid size-8 place-items-center rounded-xl text-muted hover:bg-canvas hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Informasi Keamanan Kredensial */}
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
          <ShieldCheck aria-hidden className="size-5 shrink-0 text-brand mt-0.5" />
          <p className="leading-relaxed">
            <strong>Keamanan Kredensial:</strong> Kata sandi dikelola secara mandiri di database EGOV.
            SIPATUH tidak pernah melihat atau menyimpan kata sandi pengguna.
          </p>
        </div>

        {!selectedCandidate ? (
          <div className="mt-6 space-y-5">
            {/* Form Pencarian EGOV */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  aria-hidden
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Ketik NIP, username, atau nama pegawai..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input pl-10 text-xs sm:text-sm"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="button-primary text-xs sm:text-sm shrink-0 flex items-center gap-1.5 px-4"
              >
                {isSearching ? (
                  <>
                    <Loader2 aria-hidden className="animate-spin" size={14} />
                    <span>Mencari...</span>
                  </>
                ) : (
                  <span>Cari</span>
                )}
              </button>
            </form>

            {/* Hasil Pencarian */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                Hasil Pencarian EGOV
              </span>

              {searchDone && candidates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line bg-canvas/40 py-8 text-center text-xs text-muted">
                  Tidak ditemukan akun di EGOV dengan kata kunci tersebut.
                </div>
              ) : null}

              <div className="max-h-60 overflow-y-auto divide-y divide-line/60 rounded-xl border border-line bg-canvas/30">
                {candidates.map((cand, idx) => (
                  <div
                    key={cand.id || cand.egov_user_id || cand.username || `candidate-${idx}`}
                    className="flex flex-col gap-2 p-3 text-xs sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-surface"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink">
                          {cand.nama || cand.username}
                        </span>
                        <span className="text-muted">(@{cand.username})</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-muted">
                        <span>NIP: {cand.nip || "-"}</span>
                        <span>•</span>
                        <span>Unit: {cand.unit_kerja || "-"}</span>
                      </div>
                    </div>

                    <div>
                      {cand.is_registered ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          <CheckCircle2 size={12} />
                          Terdaftar ({cand.sipatuh_role})
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectCandidate(cand)}
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 font-semibold text-brand hover:border-brand shadow-xs transition-colors"
                        >
                          <UserCheck size={14} />
                          <span>Pilih Akun</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Form Penugasan Role & Irban */
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="rounded-2xl border border-line bg-canvas/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase text-brand">
                    Akun Terpilih
                  </span>
                  <h3 className="text-base font-bold text-ink">
                    {selectedCandidate.nama || selectedCandidate.username}
                  </h3>
                  <p className="text-xs text-muted">
                    @{selectedCandidate.username} • NIP: {selectedCandidate.nip || "-"} •{" "}
                    {selectedCandidate.unit_kerja || "Unit Kerja -"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Ganti Akun
                </button>
              </div>
            </div>

            {formError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertCircle className="size-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            {/* Pemilihan Role */}
            <div className="space-y-1.5">
              <label htmlFor="select-role" className="form-label text-xs">
                Peran Pengguna (Role) *
              </label>
              <select
                id="select-role"
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

            {/* Pemilihan Wilayah Irban (Wajib untuk ADMIN_IRBAN) */}
            {role === "ADMIN_IRBAN" && (
              <div className="space-y-1.5">
                <label htmlFor="select-irban" className="form-label text-xs">
                  Penugasan Wilayah Irban *
                </label>
                <div className="relative">
                  <Building2
                    aria-hidden
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                    size={16}
                  />
                  <select
                    id="select-irban"
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
                <p className="text-xs text-muted">
                  Admin Irban hanya dapat melihat dan mengelola LHP di wilayah yang ditugaskan.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-line/60 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-semibold text-muted hover:text-ink transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={activateMutation.isPending}
                className="button-primary text-xs sm:text-sm flex items-center gap-1.5"
              >
                {activateMutation.isPending ? (
                  <>
                    <Loader2 aria-hidden className="animate-spin" size={14} />
                    <span>Mengaktifkan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Aktifkan Pengguna</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
