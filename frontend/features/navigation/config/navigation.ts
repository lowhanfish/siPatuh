import type { UserRole } from "@/features/auth/types";

export type NavigationIcon =
  | "dashboard"
  | "building"
  | "file-search"
  | "mail-warning"
  | "report"
  | "settings"
  | "users";

export type NavigationItem = {
  description: string;
  href: string;
  icon: NavigationIcon;
  label: string;
  roles: readonly UserRole[];
  section: "Pengawasan" | "Administrasi";
};

const ALL_ROLES: readonly UserRole[] = ["SUPER_ADMIN", "ADMIN_IRBAN", "BUPATI"];
const OPERATIONAL_ROLES: readonly UserRole[] = ["SUPER_ADMIN", "ADMIN_IRBAN"];

export const navigationItems: readonly NavigationItem[] = [
  {
    label: "Dashboard Pimpinan",
    description: "Ringkasan pengawasan seluruh wilayah",
    href: "/dashboard/pimpinan",
    icon: "dashboard",
    roles: ["SUPER_ADMIN", "BUPATI"],
    section: "Pengawasan",
  },
  {
    label: "Dashboard Irban",
    description: "Kinerja operasional wilayah Irban",
    href: "/dashboard/irban",
    icon: "dashboard",
    roles: OPERATIONAL_ROLES,
    section: "Pengawasan",
  },
  {
    label: "LHP",
    description: "Temuan, rekomendasi, dan tindak lanjut",
    href: "/lhp",
    icon: "file-search",
    roles: OPERATIONAL_ROLES,
    section: "Pengawasan",
  },
  {
    label: "Surat Peringatan",
    description: "SP1, SP2, SP3, dan TTE",
    href: "/surat-peringatan",
    icon: "mail-warning",
    roles: OPERATIONAL_ROLES,
    section: "Pengawasan",
  },
  {
    label: "Laporan",
    description: "Rekap dan ekspor tindak lanjut",
    href: "/laporan",
    icon: "report",
    roles: ALL_ROLES,
    section: "Pengawasan",
  },
  {
    label: "Pengguna & Irban",
    description: "Akun, role, dan wilayah kerja",
    href: "/pengguna",
    icon: "users",
    roles: ["SUPER_ADMIN"],
    section: "Administrasi",
  },
  {
    label: "Unit Kerja & Pejabat",
    description: "Pemetaan OPD dan pejabat penerima",
    href: "/unit-kerja",
    icon: "building",
    roles: OPERATIONAL_ROLES,
    section: "Administrasi",
  },
  {
    label: "Master Data",
    description: "Jenis, status, dan template surat",
    href: "/master-data",
    icon: "settings",
    roles: ["SUPER_ADMIN"],
    section: "Administrasi",
  },
] as const;

const routeRules = [
  ...navigationItems.map(({ href, roles }) => ({ href, roles })),
  { href: "/dashboard", roles: ALL_ROLES },
] as const;

function matchesPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getNavigationForRole(role: UserRole) {
  return navigationItems.filter((item) => item.roles.includes(role));
}

export function canRoleAccessPath(role: UserRole, pathname: string) {
  const rule = [...routeRules]
    .sort((a, b) => b.href.length - a.href.length)
    .find((candidate) => matchesPath(pathname, candidate.href));

  return rule ? rule.roles.includes(role) : false;
}

export function getDefaultRouteForRole(role: UserRole) {
  return role === "ADMIN_IRBAN" ? "/dashboard/irban" : "/dashboard/pimpinan";
}

export function getRouteTitle(pathname: string) {
  return (
    navigationItems.find((item) => matchesPath(pathname, item.href))?.label ??
    "SIPATUH"
  );
}
