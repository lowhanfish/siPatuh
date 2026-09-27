import type { Role } from "@/features/users/types";

type RoleBadgeProps = {
  role: Role;
};

export function RoleBadge({ role }: RoleBadgeProps) {
  switch (role) {
    case "SUPER_ADMIN":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
          <span className="size-1.5 rounded-full bg-purple-500" />
          Super Admin
        </span>
      );
    case "ADMIN_IRBAN":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-brand">
          <span className="size-1.5 rounded-full bg-brand" />
          Admin Irban
        </span>
      );
    case "BUPATI":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          <span className="size-1.5 rounded-full bg-amber-500" />
          Bupati (Read-Only)
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-2.5 py-0.5 text-xs font-semibold text-muted">
          {role}
        </span>
      );
  }
}
