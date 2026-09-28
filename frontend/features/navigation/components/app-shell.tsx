"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  BarChart3,
  Building2,
  ChevronRight,
  FileSearch,
  LogOut,
  MailWarning,
  Menu,
  Settings2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useLogout } from "@/features/auth/hooks/use-auth";
import type { AuthUser, UserRole } from "@/features/auth/types";
import { getApiErrorMessage } from "@/lib/api-client";
import { useUiStore } from "@/stores/ui-store";
import {
  getDefaultRouteForRole,
  getNavigationForRole,
  getRouteTitle,
  type NavigationIcon,
  type NavigationItem,
} from "@/features/navigation/config/navigation";

const iconMap: Record<NavigationIcon, LucideIcon> = {
  dashboard: BarChart3,
  building: Building2,
  "file-search": FileSearch,
  "mail-warning": MailWarning,
  report: BarChart3,
  settings: Settings2,
  users: Users,
};

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "Inspektur / Super Admin",
  ADMIN_IRBAN: "Admin Irban",
  BUPATI: "Bupati",
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLink({ item, pathname }: { item: NavigationItem; pathname: string }) {
  const Icon = iconMap[item.icon];
  const active = isActivePath(pathname, item.href);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
        active
          ? "bg-accent text-ink shadow-brand"
          : "text-stone-300 hover:bg-white/8 hover:text-white"
      }`}
      href={item.href}
    >
      <Icon aria-hidden className="shrink-0" size={18} strokeWidth={1.9} />
      <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
      <ChevronRight
        aria-hidden
        className={`shrink-0 transition ${active ? "opacity-80" : "opacity-0 group-hover:opacity-70"}`}
        size={15}
      />
    </Link>
  );
}

function SidebarContent({ user, pathname }: { user: AuthUser; pathname: string }) {
  const navigation = getNavigationForRole(user.role);
  const sections = ["Pengawasan", "Administrasi"] as const;

  return (
    <>
      <Link
        className="flex items-center gap-3 border-b border-white/10 px-5 py-5 text-white"
        href={getDefaultRouteForRole(user.role)}
      >
        <span className="grid size-11 place-items-center rounded-xl bg-white text-sm font-bold tracking-wide shadow-sm">
          <Image alt="Logo Inspektorat" className="h-9 w-auto object-contain" height={40} src="/brand/inspektorat.png" width={34} />
        </span>
        <span>
          <span className="block font-bold tracking-tight">SIPATUH</span>
          <span className="block text-[11px] text-stone-300">Inspektorat Konawe Selatan</span>
        </span>
      </Link>

      <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto px-3 py-5">
        {sections.map((section) => {
          const items = navigation.filter((item) => item.section === section);
          if (items.length === 0) return null;

          return (
            <div className="mb-6" key={section}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                {section}
              </p>
              <div className="space-y-1">
                {items.map((item) => (
                  <NavigationLink item={item} key={item.href} pathname={pathname} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-2xl bg-white/8 p-3 ring-1 ring-white/10">
          <p className="truncate text-sm font-semibold text-white">{user.nama}</p>
          <p className="mt-1 truncate text-xs text-stone-300">{roleLabels[user.role]}</p>
          {user.irban?.nama ? (
            <p className="mt-1 truncate text-[11px] text-amber-300">{user.irban.nama}</p>
          ) : null}
        </div>
      </div>
    </>
  );
}

export function AppShell({ children, user }: { children: ReactNode; user: AuthUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const logoutMutation = useLogout();
  const isMobileNavigationOpen = useUiStore((state) => state.isMobileNavigationOpen);
  const closeMobileNavigation = useUiStore((state) => state.closeMobileNavigation);
  const toggleMobileNavigation = useUiStore((state) => state.toggleMobileNavigation);

  useEffect(() => {
    closeMobileNavigation();
  }, [closeMobileNavigation, pathname]);

  useEffect(() => {
    if (!isMobileNavigationOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileNavigation();
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeMobileNavigation, isMobileNavigationOpen]);

  async function handleLogout() {
    try {
      await logoutMutation.mutateAsync();
      closeMobileNavigation();
      toast.success("Sesi berhasil diakhiri.");
      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)]">
      <aside className="hidden h-screen flex-col bg-sidebar lg:sticky lg:top-0 lg:flex">
        <SidebarContent pathname={pathname} user={user} />
      </aside>

      {isMobileNavigationOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Tutup navigasi"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            onClick={closeMobileNavigation}
            type="button"
          />
          <aside
            aria-label="Navigasi mobile"
            aria-modal="true"
            className="relative flex h-full w-[min(88vw,19rem)] flex-col bg-sidebar shadow-2xl"
            role="dialog"
          >
            <button
              aria-label="Tutup menu"
              className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-xl text-stone-200 transition hover:bg-white/10 hover:text-white"
              onClick={closeMobileNavigation}
              type="button"
            >
              <X aria-hidden size={20} />
            </button>
            <SidebarContent pathname={pathname} user={user} />
            <button
              className="mx-4 mb-4 flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-semibold text-stone-200 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
              disabled={logoutMutation.isPending}
              onClick={handleLogout}
              type="button"
            >
              <LogOut aria-hidden size={17} />
              {logoutMutation.isPending ? "Mengakhiri sesi…" : "Keluar"}
            </button>
          </aside>
        </div>
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-line bg-surface/92 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            aria-expanded={isMobileNavigationOpen}
            aria-label="Buka navigasi"
            className="grid size-10 place-items-center rounded-xl border border-line bg-surface text-ink lg:hidden"
            onClick={toggleMobileNavigation}
            type="button"
          >
            <Menu aria-hidden size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand">SIPATUH</p>
            <h1 className="truncate text-base font-semibold text-ink sm:text-lg">
              {getRouteTitle(pathname)}
            </h1>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <div className="text-right">
              <p className="max-w-48 truncate text-sm font-semibold text-ink">{user.nama}</p>
              <p className="text-xs text-muted">{roleLabels[user.role]}</p>
            </div>
            <button
              aria-label="Keluar dari SIPATUH"
              className="grid size-10 place-items-center rounded-xl border border-line bg-surface text-muted transition hover:border-danger hover:text-danger disabled:opacity-60"
              disabled={logoutMutation.isPending}
              onClick={handleLogout}
              title="Keluar"
              type="button"
            >
              <LogOut aria-hidden size={18} />
            </button>
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
