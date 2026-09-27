import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-6 py-16">
      <section className="w-full max-w-lg rounded-3xl border border-line bg-surface p-8 text-center shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          404 · SIPATUH
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Alamat yang dituju tidak tersedia atau telah dipindahkan.
        </p>
        <Link className="button-primary mt-7 inline-flex" href="/">
          Kembali ke beranda
        </Link>
      </section>
    </main>
  );
}
