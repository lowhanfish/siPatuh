import "@/features/panduan/components/panduan.css";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Info } from "lucide-react";
import { ThemeToggle } from "@/features/theme/theme-toggle";
import { guideFaq, guideRoles, guideSteps, type GuideRole } from "@/features/panduan/content";

export const metadata: Metadata = {
  title: "Panduan Penggunaan",
  description: "Tata cara penggunaan SIPATUH untuk Inspektur, Admin Irban, dan Bupati.",
};

const roleOrder: GuideRole[] = ["SUPER_ADMIN", "ADMIN_IRBAN", "BUPATI"];

export default function PanduanPage() {
  return (
    <div className="panduan-page">
      <a className="panduan-skip" href="#isi-panduan">Lewati navigasi</a>
      <header className="panduan-header">
        <div className="panduan-shell panduan-header-inner">
          <Link className="panduan-brand" href="/">
            <span className="panduan-brand-mark"><Image alt="Logo Inspektorat" className="h-9 w-auto" height={40} priority src="/brand/inspektorat.png" width={34} /></span>
            <span><strong>SIPATUH</strong><span>Panduan penggunaan</span></span>
          </Link>
          <nav aria-label="Navigasi panduan" className="panduan-header-actions">
            <ThemeToggle />
            <Link className="panduan-back" href="/"><ArrowLeft aria-hidden size={15} /><span>Beranda</span></Link>
            <Link className="panduan-login" href="/login">Masuk</Link>
          </nav>
        </div>
      </header>

      <main id="isi-panduan">
        <section className="panduan-hero">
          <div className="panduan-shell">
            <p className="panduan-eyebrow"><BookOpen aria-hidden size={14} /> Dokumentasi SIPATUH</p>
            <h1>Panduan penggunaan</h1>
            <p className="panduan-lead">
              Tata cara memakai SIPATUH dari masuk ke sistem hingga menyusun laporan. Ikuti langkah sesuai
              peran Anda; label peran pada setiap bagian menunjukkan siapa yang dapat melakukannya.
            </p>
            <ol className="panduan-flow" aria-label="Alur penggunaan">
              {guideSteps.map((step, index) => (
                <li key={step.id}><a href={`#${step.id}`}><span>{String(index + 1).padStart(2, "0")}</span>{step.title}</a></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="panduan-shell panduan-roles" aria-labelledby="peran-title">
          <h2 id="peran-title">Peran pengguna</h2>
          <div className="panduan-role-grid">
            {roleOrder.map((role) => {
              const info = guideRoles[role];
              return (
                <article className="panduan-role-card" data-role={role} key={role}>
                  <span className="panduan-role-badge" data-role={role}>{info.label}</span>
                  <h3>{info.title}</h3>
                  <p className="panduan-role-scope">{info.scope}</p>
                  <ul>{info.duties.map((duty) => <li key={duty}>{duty}</li>)}</ul>
                </article>
              );
            })}
          </div>
        </section>

        <div className="panduan-shell panduan-steps">
          {guideSteps.map((step, index) => (
            <section className="panduan-step" id={step.id} key={step.id} aria-labelledby={`${step.id}-title`}>
              <div className="panduan-step-text">
                <span className="panduan-step-number">Langkah {String(index + 1).padStart(2, "0")}</span>
                <h2 id={`${step.id}-title`}>{step.title}</h2>
                <div className="panduan-step-meta">
                  {step.roles.map((role) => <span className="panduan-role-badge" data-role={role} key={role}>{guideRoles[role].label}</span>)}
                  {step.path ? <code>{step.path}</code> : null}
                </div>
                <p className="panduan-step-summary">{step.summary}</p>
                <ol className="panduan-instructions">
                  {step.instructions.map((item) => <li key={item}>{item}</li>)}
                </ol>
                {step.notes?.map((note) => (
                  <p className="panduan-note" data-tone={note.tone} key={note.text}>
                    {note.tone === "warning" ? <AlertTriangle aria-hidden size={16} /> : <Info aria-hidden size={16} />}
                    <span>{note.text}</span>
                  </p>
                ))}
              </div>
              <div className="panduan-step-media">
                {step.images.map((image) => (
                  <figure key={image.src}>
                    <a href={image.src} target="_blank" rel="noopener" aria-label={`Buka gambar penuh: ${image.alt}`}>
                      <Image alt={image.alt} height={500} sizes="(max-width: 1024px) 100vw, 640px" src={image.src} width={800} />
                    </a>
                    <figcaption>{image.caption}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="panduan-shell panduan-faq" aria-labelledby="faq-title">
          <h2 id="faq-title">Tanya jawab</h2>
          <div>
            {guideFaq.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="panduan-shell">
          <div className="panduan-cta">
            <div>
              <h2>Siap mulai bekerja?</h2>
              <p>Masuk dengan akun EGOV yang sudah diaktifkan administrator Inspektorat.</p>
            </div>
            <Link className="panduan-cta-button" href="/login">Masuk ke SIPATUH <ArrowRight aria-hidden size={17} /></Link>
          </div>
        </section>
      </main>

      <footer className="panduan-footer">
        <div className="panduan-shell">
          <span>Sistem Informasi Pemantauan Hasil Pemerintahan</span>
          <span>Inspektorat Daerah Kabupaten Konawe Selatan</span>
        </div>
      </footer>
    </div>
  );
}
