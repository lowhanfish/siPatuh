"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/features/auth/hooks/use-auth";
import { canRoleAccessPath } from "@/features/navigation/config/navigation";
import { AccessDenied } from "@/features/navigation/components/access-denied";
import { AppLoading } from "@/features/navigation/components/app-loading";
import { AppShell } from "@/features/navigation/components/app-shell";

export function ProtectedApp({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (!session.isPending && !session.data) {
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
    }
  }, [pathname, router, session.data, session.isPending]);

  if (session.isPending) {
    return <AppLoading />;
  }

  if (!session.data) {
    return <AppLoading label="Mengalihkan ke halaman masuk…" />;
  }

  const content = canRoleAccessPath(session.data.role, pathname) ? (
    children
  ) : (
    <AccessDenied user={session.data} />
  );

  return <AppShell user={session.data}>{content}</AppShell>;
}
