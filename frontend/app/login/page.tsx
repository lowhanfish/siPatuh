import type { Metadata } from "next";
import Image from "next/image";
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
    <main className="hero-grid relative grid min-h-screen place-items-center overflow-hidden px-5 py-10">
      <div aria-hidden className="page-glow" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-black/10 bg-surface shadow-panel lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative overflow-hidden bg-ink p-8 text-white sm:p-10 lg:p-12">
          <div aria-hidden className="absolute -bottom-24 -right-20 size-72 rounded-full border-[4rem] border-accent/10" />
          <Link className="inline-flex items-center gap-3 text-white" href="/">
            <span className="grid size-11 place-items-center rounded-xl bg-white shadow-sm">
              <Image alt="Logo Inspektorat" className="h-9 w-auto" height={40} src="/brand/inspektorat.png" width={34} />
            </span>
            <span><span className="block font-black tracking-tight">SIPATUH</span><span className="block text-[10px] text-white/55">Inspektorat Konawe Selatan</span></span>
          </Link>
          <p className="mt-16 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
            Akses internal
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight tracking-[-0.04em] sm:text-4xl">
            Satu pintu pemantauan tindak lanjut hasil pemeriksaan.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-white/60">
            Gunakan akun EGOV yang telah diaktifkan oleh administrator SIPATUH.
            Kredensial tidak disimpan di aplikasi ini.
          </p>
          <div className="relative mt-12 flex items-center gap-3 border-t border-white/10 pt-6">
            <Image alt="Logo Kabupaten Konawe Selatan" className="h-10 w-auto" height={44} src="/brand/konawe-selatan.png" width={38} />
            <p className="text-xs leading-5 text-white/50">Pemerintah Kabupaten<br />Konawe Selatan</p>
          </div>
        </section>

        <section className="p-8 sm:p-10 lg:p-14">
          <p className="eyebrow">Selamat datang kembali</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-ink">
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
