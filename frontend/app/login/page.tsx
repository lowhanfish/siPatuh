import { ThemeToggle } from "@/features/theme/theme-toggle";
import "@/features/auth/components/login.css";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
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
    <main className="login-page">
      <header className="login-header">
        <Link className="login-brand" href="/">
          <span className="login-brand-mark"><Image alt="Logo Inspektorat" className="h-9 w-auto" height={40} priority src="/brand/inspektorat.png" width={34} /></span>
          <span><strong>SIPATUH</strong><span>Inspektorat Konawe Selatan</span></span>
        </Link>
        <div className="login-header-actions"><ThemeToggle /><Link className="login-back" href="/"><ArrowLeft aria-hidden size={15} /><span>Kembali ke beranda</span></Link></div>
      </header>

      <div className="login-layout">
        <section className="login-story" aria-labelledby="login-title">
          <p className="login-eyebrow"><span /> Pengawasan terintegrasi</p>
          <h1 id="login-title">Satu pintu.{" "}<br />Pengawasan{" "}<br /><span>lebih pasti.</span></h1>
          <p className="login-description">Satu pintu pemantauan tindak lanjut hasil pemeriksaan. Terhubung dari setiap temuan hingga tuntas.</p>
          <div className="login-emblem" aria-hidden="true">
            <div className="login-emblem-orbit" />
            <div className="login-emblem-shield"><ShieldCheck strokeWidth={1} /></div>
            <span className="login-emblem-label"><Check size={13} /> Tercatat. Terlacak. Terverifikasi.</span>
          </div>
          <div className="login-government">
            <Image alt="Logo Kabupaten Konawe Selatan" className="h-10 w-auto" height={44} src="/brand/konawe-selatan.png" width={38} />
            <p>Pemerintah Kabupaten<br /><strong>Konawe Selatan</strong></p>
          </div>
        </section>

        <section className="login-card" aria-labelledby="login-form-title">
          <div className="login-card-heading"><span className="login-lock"><ShieldCheck aria-hidden size={21} /></span><span>Akses internal / EGOV</span></div>
          <p className="login-eyebrow">Selamat datang kembali</p>
          <h2 id="login-form-title">Masuk ke akun Anda</h2>
          <p className="login-form-description">Masukkan NIP atau username beserta password EGOV.</p>
          <LoginForm redirectTo={redirectTo} />
          <div className="login-access-note"><ShieldCheck aria-hidden size={16} /><p>Gunakan akun EGOV yang telah diaktifkan oleh administrator SIPATUH. Kredensial tidak disimpan di aplikasi ini.</p></div>
          <p className="login-help">Belum memiliki akses SIPATUH?<br /><span>Hubungi administrator Inspektorat.</span></p>
        </section>
      </div>
      <footer className="login-footer"><span>Sistem Informasi Pemantauan Hasil Pemerintahan</span><span>Inspektorat Daerah Kabupaten Konawe Selatan</span></footer>
    </main>
  );
}
