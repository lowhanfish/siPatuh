"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/features/auth/hooks/use-auth";
import { getDefaultRouteForRole } from "@/features/navigation/config/navigation";

export function RoleHomeRedirect() {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (session.data) {
      router.replace(getDefaultRouteForRole(session.data.role));
    }
  }, [router, session.data]);

  return (
    <div className="grid min-h-[60vh] place-items-center" role="status">
      <div className="text-center">
        <span className="mx-auto block size-9 animate-spin rounded-full border-4 border-brand-soft border-t-brand" />
        <p className="mt-4 text-sm text-muted">Menyiapkan dashboard sesuai role…</p>
      </div>
    </div>
  );
}
