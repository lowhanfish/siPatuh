"use client";

import Link from "next/link";
import { useUnitKerjaMappings } from "@/features/unit-kerja/hooks/use-unit-kerja";
import { Building2, Edit2, Loader2 } from "lucide-react";
import type { Irban } from "@/features/users/types";
import { formatTanggalIndo } from "@/features/dashboard/utils/formatters";

type IrbanListTableProps = {
  irbans: Irban[];
  isLoading: boolean;
  onEditIrban: (irban: Irban) => void;
};

export function IrbanListTable({
  irbans,
  isLoading,
  onEditIrban,
}: IrbanListTableProps) {
  const mappingsQuery = useUnitKerjaMappings();
  const mappingsByIrban = new Map<string, string[]>();
  for (const mapping of mappingsQuery.data ?? []) {
    const names = mappingsByIrban.get(mapping.irban_id) ?? [];
    names.push(mapping.unit_kerja_nama);
    mappingsByIrban.set(mapping.irban_id, names);
  }
  for (const names of mappingsByIrban.values()) {
    names.sort((a, b) => a.localeCompare(b, "id"));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-ink sm:text-lg">
            Wilayah Kerja Inspektur Pembantu (Irban)
          </h3>
          <p className="mt-1 text-xs text-muted">
            Struktur 5 Irban Inspektorat Daerah Kabupaten Konawe Selatan
          </p>
        </div>
        <Link href="/unit-kerja" className="button-primary gap-2">
          <Building2 aria-hidden size={16} />
          Kelola Pemetaan OPD
        </Link>
      </div>

      {mappingsQuery.isError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/20 bg-danger-soft p-4 text-sm text-danger">
          <p>Daftar OPD gagal dimuat. Silakan coba kembali.</p>
          <button type="button" onClick={() => void mappingsQuery.refetch()} disabled={mappingsQuery.isFetching} className="font-semibold underline disabled:opacity-60">
            {mappingsQuery.isFetching ? "Memuat…" : "Coba lagi"}
          </button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="animate-spin text-brand" size={28} />
            <p className="mt-3 text-xs text-muted">Memuat data Irban...</p>
          </div>
        ) : irbans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="text-muted" size={28} />
            <p className="mt-3 text-sm font-semibold text-ink">Tidak ada data Irban</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-muted">
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">Kode</th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">Nama Wilayah Irban</th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">OPD dalam Wilayah Pengawasan</th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider">Diperbarui</th>
                  <th className="px-4 py-3.5 font-semibold uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {irbans.map((irb) => (
                  <tr key={irb.id} className="transition-colors hover:bg-canvas/40">
                    <td className="px-4 py-3.5 font-mono font-bold text-brand">
                      {irb.kode}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-ink sm:text-sm">
                      {irb.nama}
                    </td>
                    <td className="min-w-72 px-4 py-3.5 text-muted">
                      {mappingsQuery.isPending ? (
                        <span role="status" className="inline-flex items-center gap-2">
                          <Loader2 aria-hidden size={14} className="animate-spin" /> Memuat OPD…
                        </span>
                      ) : mappingsQuery.isError ? (
                        <span>Data OPD belum tersedia.</span>
                      ) : (mappingsByIrban.get(irb.id)?.length ?? 0) > 0 ? (
                        <details open>
                          <summary className="cursor-pointer font-semibold text-brand">
                            {mappingsByIrban.get(irb.id)!.length} OPD · Lihat daftar
                          </summary>
                          <ul className="mt-3 space-y-2 pl-4 list-disc text-ink">
                            {mappingsByIrban.get(irb.id)!.map((name, index) => (
                              <li key={`${index}-${name}`}>{name}</li>
                            ))}
                          </ul>
                        </details>
                      ) : (
                        <span>Belum ada OPD yang dipetakan.</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-muted">
                      {formatTanggalIndo(irb.updated_at)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => onEditIrban(irb)}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 font-semibold text-ink hover:border-brand hover:text-brand shadow-xs transition-colors"
                      >
                        <Edit2 size={13} />
                        <span>Ubah</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-line/60 bg-canvas/30 px-4 py-3 text-xs text-muted">
          Master 5 Irban bersifat permanen. Perubahan nama tidak mengubah integritas snapshot LHP lama.
        </div>
      </div>
    </div>
  );
}
