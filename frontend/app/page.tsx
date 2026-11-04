import "@/features/landing/components/landing.css";
import Image from "next/image";
import { CinematicMotion } from "@/features/landing/components/cinematic-motion";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FolderClock,
  ShieldCheck,
} from "lucide-react";
import { SessionActions } from "@/features/auth/components/session-actions";

const processSteps = [
  { label: "LHP", detail: "Dokumen pemeriksaan tercatat rapi" },
  { label: "Temuan", detail: "Setiap temuan mudah ditelusuri" },
  { label: "Rekomendasi", detail: "Status dan nilai selalu terpantau" },
  { label: "Tindak lanjut", detail: "Bukti tersimpan dalam satu riwayat" },
  { label: "Verifikasi", detail: "Keputusan jelas dan akuntabel" },
];

const benefits = [
  {
    icon: FolderClock,
    title: "Rekam jejak utuh",
    text: "Riwayat tindak lanjut tersimpan berurutan, sehingga dokumen dan perubahan tidak tercecer.",
  },
  {
    icon: BarChart3,
    title: "Pantauan lebih cepat",
    text: "Pimpinan dan Irban melihat progres penyelesaian dari satu sumber data yang sama.",
  },
  {
    icon: ShieldCheck,
    title: "Akses sesuai peran",
    text: "Data dan fungsi aplikasi ditampilkan sesuai kewenangan setiap pengguna.",
  },
];

export default function Home() {
  return (
    <CinematicMotion>
    <main className="min-h-screen overflow-clip bg-canvas">
      <a className="landing-skip" href="#konten">Lewati navigasi</a>
      <header className="cinema-header relative z-30 border-b border-black/10 bg-[#fffaf0]/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 w-full max-w-[86rem] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <Link className="group flex min-w-0 items-center gap-3" href="/">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-black/8 transition-transform group-hover:-rotate-2">
              <Image alt="Logo Inspektorat" className="h-10 w-auto object-contain" height={44} priority src="/brand/inspektorat.png" width={36} />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-black tracking-[-0.04em] text-ink">SIPATUH</span>
              <span className="hidden truncate text-[11px] font-medium text-muted sm:block">Inspektorat Daerah Kabupaten Konawe Selatan</span>
            </span>
          </Link>
          <nav aria-label="Navigasi utama" className="flex items-center gap-6">
            <a className="landing-nav-link hidden text-xs font-medium md:block" href="#alur">Alur pengawasan</a>
            <a className="landing-nav-link hidden text-xs font-medium md:block" href="#manfaat">Manfaat</a>
            <SessionActions />
          </nav>
        </div>
      </header>

      <section id="konten" className="cinema-hero hero-grid relative isolate border-b border-black/10">
        <div aria-hidden className="cinema-grain" />
        <div aria-hidden className="cinema-orbit" />
        <div aria-hidden className="hero-orb hero-orb-one" />
        <div aria-hidden className="hero-orb hero-orb-two" />
        <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-[86rem] items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.03fr_0.97fr] lg:px-12 lg:py-24">
          <div className="cinema-intro relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-900/15 bg-white/70 px-3.5 py-2 text-xs font-bold text-brand shadow-sm backdrop-blur">
              <span className="size-2 rounded-full bg-accent shadow-[0_0_0_5px_rgb(255_201_40/0.18)]" />
              SIPATUH / PENGAWASAN TERINTEGRASI
            </div>
            <h1 className="mt-7 max-w-3xl text-[clamp(3.25rem,7vw,6.8rem)] font-black leading-[0.9] tracking-[-0.075em] text-ink">
              Pantau.<br />Tindak lanjuti.<br />
              <span className="cinema-title-accent relative inline-block text-brand">
                Tuntaskan.
                <span aria-hidden className="absolute -bottom-2 left-1 h-2 w-[88%] -rotate-1 rounded-full bg-accent" />
              </span>
            </h1>
            <p className="mt-9 max-w-2xl text-base font-medium leading-8 text-muted sm:text-lg">
              SIPATUH menyatukan hasil pemeriksaan, rekomendasi, dokumen tindak lanjut,
              dan verifikasi agar pengawasan Pemerintah Kabupaten Konawe Selatan lebih
              tertib, transparan, dan akuntabel.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link className="landing-primary" href="/login">Masuk ke SIPATUH <ArrowRight aria-hidden size={18} /></Link>
              <a className="landing-secondary" href="#alur">Lihat alur sistem</a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-ink/75">
              <span className="flex items-center gap-2"><CheckCircle2 className="text-brand" size={17} />Data terpusat</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="text-brand" size={17} />Akses berbasis peran</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="text-brand" size={17} />Jejak audit jelas</span>
            </div>
          </div>

          <div className="oversight-scene" aria-label="Ilustrasi tiga dimensi dokumen pengawasan terverifikasi" role="img">
            <div className="scene-halo" aria-hidden="true" />
            <div className="scene-orbit scene-orbit-one" aria-hidden="true" />
            <div className="scene-orbit scene-orbit-two" aria-hidden="true" />
            <div className="scene-world" aria-hidden="true">
              <div className="scene-platform" />
              <div className="document-stack document-stack-back" />
              <div className="document-stack document-stack-middle" />
              <div className="oversight-document">
                <div className="document-heading"><span>SIPATUH</span><span>01 / LHP</span></div>
                <span className="document-kicker">PENGAWASAN TERINTEGRASI</span>
                <strong>Setiap temuan.<br />Satu kepastian.</strong>
                <div className="document-rule" />
                <div className="document-row"><span>Hasil pemeriksaan</span><CheckCircle2 size={15} /></div>
                <div className="document-row"><span>Rekomendasi</span><CheckCircle2 size={15} /></div>
                <div className="document-row"><span>Tindak lanjut</span><CheckCircle2 size={15} /></div>
                <div className="document-track"><span /><span /><span /><span /><span /></div>
                <div className="document-bottom"><span>TERCATAT. TERLACAK.</span><span>TERVERIFIKASI.</span></div>
              </div>
              <div className="oversight-shield"><ShieldCheck strokeWidth={1} /></div>
            </div>
            <div className="scene-label scene-label-top"><span className="scene-status" /> Satu data pengawasan</div>
            <div className="scene-label scene-label-bottom"><CheckCircle2 size={17} /><span>Akuntabilitas<br /><strong>di setiap langkah.</strong></span></div>
            <span className="scene-caption">TERHUBUNG DARI TEMUAN HINGGA TUNTAS</span>
          </div>
        </div>
      </section>

      <section className="cinema-process bg-ink text-white" id="alur">
        <div className="mx-auto w-full max-w-[86rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="cinema-reveal grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <p className="eyebrow eyebrow-light">Alur pengawasan</p>
              <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.045em] sm:text-5xl">Dari temuan sampai tuntas, semuanya terbaca.</h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-white/60 lg:ml-auto">Setiap tahap saling terhubung untuk mengurangi rekap manual dan memberi kepastian status pada setiap rekomendasi.</p>
          </div>
          <ol className="mt-12 grid overflow-hidden rounded-3xl border border-white/12 bg-white/[0.045] sm:grid-cols-2 lg:grid-cols-5">
            {processSteps.map((step, index) => (
              <li className="cinema-reveal group relative min-h-48 border-b border-white/10 p-6 last:border-b-0 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:border-r lg:last:border-r-0" key={step.label}>
                <span className="text-xs font-black tracking-[0.18em] text-[#ffd24a]">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="mt-10 text-lg font-bold">{step.label}</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">{step.detail}</p>
                <ArrowRight aria-hidden className="absolute right-5 top-5 text-white/20 transition-transform group-hover:translate-x-1 group-hover:text-[#ffd24a]" size={18} />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="leadership-section">
        <div className="leadership-inner cinema-reveal">
          <div className="leadership-photo"><Image alt="Inspektur Daerah Kabupaten Konawe Selatan" src="/brand/inspektur.jpg" fill sizes="(max-width: 640px) 100px, 180px" className="object-cover object-[50%_24%]" /></div>
          <div><p className="eyebrow eyebrow-light">Komitmen pimpinan</p><blockquote>“Pengawasan yang responsif untuk tata kelola yang semakin baik.”</blockquote><p className="leadership-credit">Inspektur Daerah Kabupaten Konawe Selatan</p></div>
          <span className="leadership-mark" aria-hidden="true">“</span>
        </div>
      </section>

      <section className="cinema-benefits bg-[#fffaf0]" id="manfaat">
        <div className="mx-auto w-full max-w-[86rem] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="benefits-heading cinema-reveal"><p className="eyebrow eyebrow-light">Bekerja dengan kepastian</p><h2>Lebih terarah.<br />Lebih akuntabel.</h2><p>Informasi yang utuh membantu setiap peran mengambil langkah yang tepat.</p></div>
          <div className="grid gap-5 md:grid-cols-3">
            {benefits.map((item, index) => {
              const Icon = item.icon;
              return (
                <article className={`cinema-reveal landing-card ${index === 1 ? "md:translate-y-8" : ""}`} key={item.title}>
                  <span className="grid size-12 place-items-center rounded-2xl bg-accent text-ink"><Icon size={23} strokeWidth={2.2} /></span>
                  <h3 className="mt-8 text-2xl font-black tracking-[-0.035em] text-ink">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted">{item.text}</p>
                </article>
              );
            })}
          </div>
          <div className="cinema-cta cinema-reveal mt-20 grid items-center gap-10 overflow-hidden rounded-[2rem] bg-accent p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:p-14">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-ink/55">Siap bekerja lebih tertib?</p>
              <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-[-0.045em] text-ink sm:text-5xl">Mulai pemantauan dari satu sistem yang sama.</h2>
            </div>
            <Link className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-ink px-7 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black" href="/login">Masuk sekarang <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>

      <footer className="cinema-footer border-t border-black/10 bg-[#fffaf0]">
        <div className="mx-auto flex w-full max-w-[86rem] flex-col gap-6 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <div className="flex items-center gap-4">
            <Image alt="Logo Kabupaten Konawe Selatan" className="h-12 w-auto" height={52} src="/brand/konawe-selatan.png" width={44} />
            <Image alt="Logo Inspektorat" className="h-12 w-auto" height={52} src="/brand/inspektorat.png" width={42} />
            <div><p className="text-sm font-black text-ink">SIPATUH</p><p className="text-xs text-muted">Inspektorat Daerah Kabupaten Konawe Selatan</p></div>
          </div>
          <Image alt="Konawe Selatan Setara" className="h-auto w-44 object-contain" height={58} src="/brand/konsel-setara.png" width={174} />
        </div>
      </footer>
    </main>
    </CinematicMotion>
  );
}
