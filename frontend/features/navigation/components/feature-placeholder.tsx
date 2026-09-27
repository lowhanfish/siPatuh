import { ArrowRight, CheckCircle2, Clock3 } from "lucide-react";

type FeaturePlaceholderProps = {
  checkpoint: string;
  description: string;
  eyebrow?: string;
  title: string;
};

export function FeaturePlaceholder({
  checkpoint,
  description,
  eyebrow = "Modul SIPATUH",
  title,
}: FeaturePlaceholderProps) {
  return (
    <div className="mx-auto max-w-6xl">
      <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
        <div className="border-b border-line bg-gradient-to-r from-brand-soft/80 to-transparent px-6 py-7 sm:px-8">
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            {description}
          </p>
        </div>

        <div className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
          <article className="rounded-2xl border border-line bg-canvas/65 p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <CheckCircle2 aria-hidden size={20} />
            </span>
            <h3 className="mt-4 font-semibold text-ink">Fondasi route siap</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              App shell, session guard, dan pembatasan role sudah aktif pada halaman ini.
            </p>
          </article>

          <article className="rounded-2xl border border-dashed border-line-strong bg-surface p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <Clock3 aria-hidden size={20} />
            </span>
            <h3 className="mt-4 font-semibold text-ink">Implementasi domain berikutnya</h3>
            <p className="mt-2 flex items-center gap-2 text-sm leading-6 text-muted">
              <span>{checkpoint}</span>
              <ArrowRight aria-hidden className="shrink-0" size={15} />
              <span>Belum dikerjakan pada F03</span>
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
