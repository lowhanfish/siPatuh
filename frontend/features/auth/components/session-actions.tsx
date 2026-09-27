"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLogout, useSession } from "@/features/auth/hooks/use-auth";
import { getApiErrorMessage } from "@/lib/api-client";
import type { UserRole } from "@/features/auth/types";

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "Inspektur",
  ADMIN_IRBAN: "Admin Irban",
  BUPATI: "Bupati",
};

export function SessionActions() {
  const router = useRouter();
  const session = useSession();
  const logoutMutation = useLogout();

  async function handleLogout() {
    try {
      await logoutMutation.mutateAsync();
      toast.success("Sesi berhasil diakhiri.");
      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  if (session.isPending) {
    return (
      <span
        aria-label="Memeriksa sesi"
        className="h-9 w-24 animate-pulse rounded-full bg-brand-soft"
      />
    );
  }

  if (!session.data) {
    return (
      <Link className="button-primary inline-flex min-h-10 px-4 py-2" href="/login">
        Masuk
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-semibold text-ink">{session.data.nama}</p>
        <p className="text-xs text-muted">{roleLabels[session.data.role]}</p>
      </div>
      <button
        className="rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-muted transition hover:border-brand hover:text-brand disabled:opacity-60"
        disabled={logoutMutation.isPending}
        onClick={handleLogout}
        type="button"
      >
        {logoutMutation.isPending ? "Keluar…" : "Keluar"}
      </button>
    </div>
  );
}
