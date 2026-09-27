import Link from "next/link";
import { ShieldX } from "lucide-react";
import { getDefaultRouteForRole } from "@/features/navigation/config/navigation";
import type { AuthUser } from "@/features/auth/types";

export function AccessDenied({ user }: { user: AuthUser }) {
  return (
    <section className="grid min-h-[65vh] place-items-center px-5 py-12">
      <div className="w-full max-w-xl rounded-3xl border border-line bg-surface p-8 text-center shadow-card sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger">
          <ShieldX aria-hidden size={26} />
        </span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-danger">
          403 · Akses dibatasi
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          Halaman ini tidak tersedia untuk role Anda
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Anda masuk sebagai <strong className="text-ink">{user.role}</strong>.
          Pembatasan ini membantu navigasi pengguna; backend tetap menjadi otoritas
          akhir untuk setiap akses data dan mutasi.
        </p>
        <Link
          className="button-primary mt-7 inline-flex"
          href={getDefaultRouteForRole(user.role)}
        >
          Kembali ke dashboard
        </Link>
      </div>
    </section>
  );
}
