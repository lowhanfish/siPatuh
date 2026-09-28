"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Building2, Search } from "lucide-react";
import type { OpdReportSummaryItem } from "../types";
import { formatPercent, formatRupiah } from "@/features/dashboard/utils/formatters";

type ReportOpdMatrixProps = {
  items: OpdReportSummaryItem[];
};

export function ReportOpdMatrix({ items }: ReportOpdMatrixProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof OpdReportSummaryItem>("persen_selesai");
  const [sortAsc, setSortAsc] = useState(false);

  const filteredAndSorted = useMemo(() => {
    let result = [...items];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.nama_opd.toLowerCase().includes(q) ||
          i.irban_nama.toLowerCase().includes(q),
      );
    }

    result.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === "string" && typeof valB === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc
        ? Number(valA) - Number(valB)
        : Number(valB) - Number(valA);
    });

    return result;
  }, [items, searchQuery, sortField, sortAsc]);

  function handleSort(field: keyof OpdReportSummaryItem) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default desc
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface shadow-card overflow-hidden space-y-3">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 border-b border-line bg-canvas/30">
        <div>
          <h4 className="text-sm font-bold text-ink flex items-center gap-2">
            <Building2 size={16} className="text-brand" />
            <span>Matriks Kinerja Penyelesaian per Perangkat Daerah ({filteredAndSorted.length})</span>
          </h4>
          <p className="text-2xs text-muted">
            Tabel rekapitulasi temuan, rekomendasi, dan pemulihan kerugian daerah per OPD
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama OPD..."
            className="input pl-9 text-xs w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-line bg-canvas/60 text-2xs font-bold uppercase tracking-wider text-muted select-none">
            <tr>
              <th
                onClick={() => handleSort("nama_opd")}
                className="px-4 py-3.5 cursor-pointer hover:text-ink"
              >
                <div className="flex items-center gap-1">
                  <span>Perangkat Daerah</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th
                onClick={() => handleSort("total_lhp")}
                className="px-4 py-3.5 text-center cursor-pointer hover:text-ink"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>LHP</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th
                onClick={() => handleSort("total_temuan")}
                className="px-4 py-3.5 text-center cursor-pointer hover:text-ink"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Temuan</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th
                onClick={() => handleSort("total_rekomendasi")}
                className="px-4 py-3.5 text-center cursor-pointer hover:text-ink"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Rekomendasi</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th
                onClick={() => handleSort("persen_selesai")}
                className="px-4 py-3.5 cursor-pointer hover:text-ink"
              >
                <div className="flex items-center gap-1">
                  <span>Penyelesaian (%)</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th
                onClick={() => handleSort("nilai_rekomendasi")}
                className="px-4 py-3.5 text-right cursor-pointer hover:text-ink"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Nilai Rekomendasi</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th
                onClick={() => handleSort("nilai_setor")}
                className="px-4 py-3.5 text-right cursor-pointer hover:text-ink"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Disetor (Kasda)</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th
                onClick={() => handleSort("sisa_rekomendasi")}
                className="px-4 py-3.5 text-right cursor-pointer hover:text-ink"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Sisa Tunggakan</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-2xs text-muted">
                  Tidak ada data perangkat daerah yang sesuai kriteria pencarian.
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((opd) => (
                <tr key={opd.simpeg_unit_kerja_id} className="hover:bg-canvas/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-bold text-ink block">{opd.nama_opd}</span>
                    <span className="text-[10px] text-muted">{opd.irban_nama}</span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-ink">{opd.total_lhp}</td>
                  <td className="px-4 py-3 text-center text-muted">{opd.total_temuan}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-ink">{opd.total_rekomendasi}</span>
                    <span className="text-[10px] text-muted block">
                      ({opd.selesai} Selesai)
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1 w-32">
                      <div className="flex items-center justify-between text-2xs">
                        <span className="font-bold text-emerald-800">
                          {formatPercent(opd.persen_selesai)}%
                        </span>
                      </div>
                      <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, opd.persen_selesai))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-ink whitespace-nowrap">
                    {formatRupiah(opd.nilai_rekomendasi)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-800 whitespace-nowrap">
                    {formatRupiah(opd.nilai_setor)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-rose-800 whitespace-nowrap">
                    {formatRupiah(opd.sisa_rekomendasi)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
