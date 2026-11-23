"use client";

import Link from "next/link";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLogout, useSession } from "@/features/auth/hooks/use-auth";
import { getApiErrorMessage } from "@/lib/api-client";
import type { UserRole } from "@/features/auth/types";
import { getDefaultRouteForRole } from "@/features/navigation/config/navigation";

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
      <Link
        aria-label="Buka aplikasi"
        className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-muted transition hover:border-brand hover:text-brand"
        href={getDefaultRouteForRole(session.data.role)}
        title="Buka aplikasi"
      >
        <LayoutDashboard aria-hidden size={18} />
      </Link>
      <button
        aria-label={logoutMutation.isPending ? "Mengakhiri sesi" : "Keluar dari SIPATUH"}
        className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-muted transition hover:border-danger hover:text-danger disabled:opacity-60"
        disabled={logoutMutation.isPending}
        onClick={handleLogout}
        title="Keluar"
        type="button"
      >
        <LogOut aria-hidden size={18} />
      </button>
    </div>
  );
}
