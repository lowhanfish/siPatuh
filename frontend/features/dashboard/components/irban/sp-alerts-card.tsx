import Link from "next/link";
import { ArrowUpRight, Calendar, Clock, ShieldAlert } from "lucide-react";
import type { SpAlerts } from "@/features/dashboard/types";
import { formatTanggalIndo } from "@/features/dashboard/utils/formatters";

type SpAlertsCardProps = {
  spAlerts: SpAlerts;
};

function getSpLevelBadge(level: "SP1" | "SP2" | "SP3" | null) {
  switch (level) {
    case "SP1":
      return {
        label: "SP1 (≥ 30 Hari)",
        classes: "bg-amber-100 text-amber-900 border-amber-300",
      };
    case "SP2":
      return {
        label: "SP2 (≥ 45 Hari)",
        classes: "bg-orange-100 text-orange-900 border-orange-300",
      };
    case "SP3":
      return {
        label: "SP3 (≥ 60 Hari)",
        classes: "bg-rose-100 text-rose-900 border-rose-300",
      };
    default:
      return {
        label: "SP Terjadwal",
        classes: "bg-slate-100 text-slate-800 border-slate-300",
      };
  }
}

export function SpAlertsCard({ spAlerts }: SpAlertsCardProps) {
  const hasDue = spAlerts.items && spAlerts.items.length > 0;

  return (
    <article className="rounded-2xl border border-line bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold tracking-tight text-ink sm:text-lg">
              Peringatan Tindak Lanjut (SP Due)
            </h3>
            {spAlerts.total_due > 0 && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                {spAlerts.total_due} Perlu SP
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">
            LHP yang melewati batas tindak lanjut 30 / 45 / 60 hari kalender sejak diterima OPD
          </p>
        </div>
        <span
          className={`grid size-9 place-items-center rounded-xl ${
            spAlerts.total_due > 0
              ? "bg-rose-50 text-rose-600"
              : "bg-brand-soft text-brand"
          }`}
        >
          <ShieldAlert aria-hidden size={18} />
        </span>
      </div>

      <div className="mt-5">
        {!hasDue ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-canvas/40 py-8 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Clock aria-hidden size={20} />
            </span>
            <p className="mt-3 font-semibold text-ink text-sm">Tidak ada tunggakan SP</p>
            <p className="mt-1 max-w-sm text-xs text-muted">
              Semua LHP di wilayah Irban ini masih dalam batas waktu atau rekomendasi telah berstatus selesai.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line/60">
            {spAlerts.items.map((item) => {
              const badge = getSpLevelBadge(item.eligible_level);

              return (
                <div
                  key={item.lhp_id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-xs font-bold ${badge.classes}`}
                      >
                        {badge.label}
                      </span>
                      <span className="font-semibold text-ink text-sm">
                        {item.nomor_lhp}
                      </span>
                    </div>

                    <p className="text-xs text-ink/80">
                      {item.unit_kerja_nama ? (
                        <span className="font-medium text-ink">{item.unit_kerja_nama}</span>
                      ) : (
                        <span className="text-muted">Unit Kerja #{item.simpeg_unit_kerja_id}</span>
                      )}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Calendar aria-hidden size={13} />
                        Diterima: {formatTanggalIndo(item.tanggal_diterima_lhp)}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-rose-700">
                        Umur: {item.age_days} hari kalender
                      </span>
                      <span>•</span>
                      <span>
                        Outstanding: {item.pending_rekomendasi_count} rekomendasi
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/surat-peringatan?lhp_id=${encodeURIComponent(item.lhp_id)}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-xs transition-colors hover:border-brand hover:text-brand"
                    >
                      <span>Proses SP</span>
                      <ArrowUpRight aria-hidden size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-line/60 pt-4">
        <Link
          href="/surat-peringatan"
          className="text-xs font-semibold text-brand transition-colors hover:text-brand-strong"
        >
          Lihat Semua Daftar Surat Peringatan &rarr;
        </Link>
        <span className="text-xs text-muted">
          Perbup Konsel No. 1/2012
        </span>
      </div>
    </article>
  );
}
