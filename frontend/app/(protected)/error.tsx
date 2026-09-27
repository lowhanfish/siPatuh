"use client";

import { CircleAlert } from "lucide-react";

export default function ProtectedError({ retry }: { retry: () => void }) {
  return (
    <section className="grid min-h-[65vh] place-items-center px-5 py-12">
      <div className="w-full max-w-xl rounded-3xl border border-line bg-surface p-8 text-center shadow-card">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger">
          <CircleAlert aria-hidden size={26} />
        </span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-danger">
          Terjadi kesalahan
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          Modul belum dapat ditampilkan
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Coba muat kembali halaman ini. Detail teknis tidak ditampilkan untuk menjaga keamanan data.
        </p>
        <button className="button-primary mt-7" onClick={() => retry()} type="button">
          Coba lagi
        </button>
      </div>
    </section>
  );
}
