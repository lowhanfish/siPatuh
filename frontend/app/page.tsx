import { FoundationOverview } from "@/features/foundation/components/foundation-overview";
import { SessionActions } from "@/features/auth/components/session-actions";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas">
      <div aria-hidden className="page-glow" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-line pb-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-brand text-sm font-bold tracking-wide text-white shadow-brand">
              SP
            </span>
            <div>
              <p className="text-base font-bold tracking-tight text-ink">SIPATUH</p>
              <p className="text-xs text-muted">Inspektorat Daerah Konawe Selatan</p>
            </div>
          </div>
          <SessionActions />
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div className="max-w-3xl">
            <p className="eyebrow">SIPATUH · Sistem Pengawasan Internal</p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.04em] text-ink sm:text-5xl lg:text-6xl">
              Pemantauan tindak lanjut yang tertib, terukur, dan dapat ditelusuri.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
              Fondasi antarmuka SIPATUH telah disiapkan untuk menghubungkan alur
              LHP, temuan, rekomendasi, tindak lanjut, verifikasi, dan pelaporan
              dalam satu sistem pengawasan.
            </p>

            <div className="mt-9 flex flex-wrap gap-3 text-sm">
              <span className="info-chip">Next.js App Router</span>
              <span className="info-chip">TypeScript strict</span>
              <span className="info-chip">Role-based navigation</span>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-line bg-surface/90 p-6 shadow-panel backdrop-blur sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              Alur utama V1
            </p>
            <ol className="mt-6 space-y-3">
              {["LHP", "Temuan", "Rekomendasi", "Tindak Lanjut", "Verifikasi"].map(
                (step, index) => (
                  <li className="flex items-center gap-4" key={step}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-sm font-bold text-brand">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="font-medium text-ink">{step}</span>
                    {index < 4 ? <span className="ml-auto text-line-strong">→</span> : null}
                  </li>
                ),
              )}
            </ol>
          </aside>
        </section>

        <section aria-labelledby="foundation-title" className="pb-10">
          <div className="mb-5 flex items-end justify-between gap-5">
            <div>
              <p className="eyebrow">Arsitektur klien</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink" id="foundation-title">
                Fondasi aplikasi siap digunakan
              </h2>
            </div>
            <p className="hidden max-w-sm text-right text-sm leading-6 text-muted md:block">
              Autentikasi cookie, auto-refresh, dan app shell responsif telah aktif.
            </p>
          </div>
          <FoundationOverview />
        </section>
      </div>
    </main>
  );
}
