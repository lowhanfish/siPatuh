"use client";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-6 py-16">
      <section className="w-full max-w-lg rounded-3xl border border-line bg-surface p-8 text-center shadow-card">
        <div className="mx-auto mb-5 grid size-12 place-items-center rounded-2xl bg-danger-soft text-xl font-bold text-danger">
          !
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          SIPATUH
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          Halaman belum dapat ditampilkan
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Terjadi gangguan sementara. Coba muat ulang bagian ini. Jika masalah
          berlanjut, hubungi pengelola aplikasi.
        </p>
        <button className="button-primary mt-7" onClick={() => retry()} type="button">
          Coba lagi
        </button>
      </section>
    </main>
  );
}
