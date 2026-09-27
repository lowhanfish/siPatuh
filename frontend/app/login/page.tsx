import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/features/auth/components/login-form";
import { getSafeRedirect } from "@/features/auth/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Masuk",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requestedRedirect = Array.isArray(params.next) ? params.next[0] : params.next;
  const redirectTo = requestedRedirect
    ? getSafeRedirect(requestedRedirect, "") || null
    : null;

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-canvas px-5 py-10">
      <div aria-hidden className="page-glow" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-line bg-surface shadow-panel lg:grid-cols-[0.9fr_1.1fr]">
        <section className="bg-brand p-8 text-white sm:p-10 lg:p-12">
          <Link className="inline-flex items-center gap-3 text-white" href="/">
            <span className="grid size-10 place-items-center rounded-xl bg-white/15 text-sm font-bold tracking-wide ring-1 ring-white/25">
              SP
            </span>
            <span className="font-bold tracking-tight">SIPATUH</span>
          </Link>
          <p className="mt-16 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
            Inspektorat Daerah
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Satu pintu pemantauan tindak lanjut hasil pemeriksaan.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-blue-100">
            Gunakan akun EGOV yang telah diaktifkan oleh administrator SIPATUH.
            Kredensial tidak disimpan di aplikasi ini.
          </p>
        </section>

        <section className="p-8 sm:p-10 lg:p-12">
          <p className="eyebrow">Akses internal</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
            Masuk ke akun Anda
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Masukkan NIP atau username beserta password EGOV.
          </p>
          <LoginForm redirectTo={redirectTo} />
          <p className="mt-6 text-center text-xs leading-5 text-muted">
            Belum memiliki akses SIPATUH? Hubungi administrator Inspektorat.
          </p>
        </section>
      </div>
    </main>
  );
}
