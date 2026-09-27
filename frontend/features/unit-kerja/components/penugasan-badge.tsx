import type { JenisPenugasan } from "@/features/unit-kerja/types";

export function PenugasanBadge({ jenis }: { jenis: JenisPenugasan }) {
  switch (jenis) {
    case "DEFINITIF":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-brand">
          <span className="size-1.5 rounded-full bg-brand" />
          Definitif
        </span>
      );
    case "PLT":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          <span className="size-1.5 rounded-full bg-amber-500" />
          Pelaksana Tugas (PLT)
        </span>
      );
    case "PLH":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
          <span className="size-1.5 rounded-full bg-purple-500" />
          Pelaksana Harian (PLH)
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas px-2.5 py-0.5 text-xs font-semibold text-muted">
          {jenis}
        </span>
      );
  }
}
