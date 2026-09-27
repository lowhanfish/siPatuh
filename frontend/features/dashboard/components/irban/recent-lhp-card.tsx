import Link from "next/link";
import { ArrowUpRight, CheckCircle2, FileText, FolderOpen } from "lucide-react";
import type { RecentLhpItem } from "@/features/dashboard/types";
import { formatTanggalIndo } from "@/features/dashboard/utils/formatters";

type RecentLhpCardProps = {
  recentLhps: RecentLhpItem[];
};

export function RecentLhpCard({ recentLhps }: RecentLhpCardProps) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-ink sm:text-lg">
            LHP Terkini Wilayah Irban
          </h3>
          <p className="mt-1 text-xs text-muted">
            Daftar pemeriksaan terbaru yang sedang atau telah ditangani
          </p>
        </div>
        <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand">
          <FileText aria-hidden size={18} />
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        {recentLhps.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-canvas/40 py-8 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-slate-100 text-muted">
              <FolderOpen aria-hidden size={20} />
            </span>
            <p className="mt-3 font-semibold text-ink text-sm">Belum ada LHP</p>
            <p className="mt-1 max-w-sm text-xs text-muted">
              Belum ada LHP yang terdaftar pada tahun berjalan di wilayah Irban ini.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="pb-3 font-semibold uppercase tracking-wider">Nomor LHP</th>
                <th className="pb-3 font-semibold uppercase tracking-wider">Tanggal LHP</th>
                <th className="pb-3 font-semibold uppercase tracking-wider text-center">Temuan</th>
                <th className="pb-3 font-semibold uppercase tracking-wider text-center">Rekomendasi</th>
                <th className="pb-3 font-semibold uppercase tracking-wider text-center">Status</th>
                <th className="pb-3 font-semibold uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {recentLhps.map((lhp) => {
                const isClosed = !!lhp.closed_at;

                return (
                  <tr key={lhp.id} className="transition-colors hover:bg-canvas/50">
                    <td className="py-3.5 font-semibold text-ink">
                      {lhp.nomor_lhp}
                    </td>
                    <td className="py-3.5 text-muted">
                      {formatTanggalIndo(lhp.tanggal_lhp)}
                    </td>
                    <td className="py-3.5 text-center font-medium text-ink">
                      {lhp.temuan_count}
                    </td>
                    <td className="py-3.5 text-center font-medium text-ink">
                      {lhp.rekomendasi_count}
                    </td>
                    <td className="py-3.5 text-center">
                      {isClosed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700">
                          <CheckCircle2 size={12} />
                          Selesai
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-700">
                          <span className="size-1.5 rounded-full bg-amber-500" />
                          Berjalan
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-right">
                      <Link
                        href={`/lhp?search=${encodeURIComponent(lhp.nomor_lhp)}`}
                        className="inline-flex items-center gap-1 font-semibold text-brand hover:text-brand-strong"
                      >
                        <span>Buka</span>
                        <ArrowUpRight size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-4">
        <Link
          href="/lhp"
          className="text-xs font-semibold text-brand transition-colors hover:text-brand-strong"
        >
          Lihat Semua Data LHP &rarr;
        </Link>
        <span className="text-xs text-muted">
          Menampilkan {recentLhps.length} pemeriksaan terbaru
        </span>
      </div>
    </article>
  );
}
