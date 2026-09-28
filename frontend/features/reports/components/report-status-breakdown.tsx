"use client";

import { PieChart } from "lucide-react";
import type { StatusCountItem } from "../types";

type ReportStatusBreakdownProps = {
  items: StatusCountItem[];
  totalRekomendasi: number;
};

export function ReportStatusBreakdown({
  items,
  totalRekomendasi,
}: ReportStatusBreakdownProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between border-b border-line/60 pb-3">
        <div className="flex items-center gap-2">
          <PieChart size={16} className="text-brand" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
            Distribusi Status Rekomendasi
          </h4>
        </div>
        <span className="text-2xs text-muted font-medium">
          Total: {totalRekomendasi} Rekomendasi
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const isSelesai = item.kategori === "SELESAI";
          const percentage =
            totalRekomendasi > 0
              ? ((item.count / totalRekomendasi) * 100).toFixed(1)
              : "0";

          return (
            <div
              key={item.status_id}
              className={`rounded-2xl border p-3.5 space-y-2 ${
                isSelesai
                  ? "border-emerald-200 bg-emerald-50/40"
                  : "border-amber-200 bg-amber-50/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink truncate" title={item.nama}>
                  {item.nama}
                </span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                    isSelesai
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {item.kategori}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-ink">{item.count}</span>
                <span className="text-xs font-bold text-muted">{percentage}%</span>
              </div>

              <div className="w-full bg-line/60 rounded-full h-1 overflow-hidden">
                <div
                  className={`h-1 rounded-full ${
                    isSelesai ? "bg-emerald-600" : "bg-amber-500"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
