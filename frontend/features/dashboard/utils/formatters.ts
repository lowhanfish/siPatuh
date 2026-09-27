/**
 * Format angka ke format Rupiah Indonesia (Rp xx.xxx.xxx)
 */
export function formatRupiah(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "Rp 0";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format tanggal ISO ke format Indonesia ringkas (mis. 24 Sep 2026)
 */
export function formatTanggalIndo(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "-";
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Format persentase (mis. 75,5%)
 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0%";
  }

  return `${Number(value.toFixed(1)).toLocaleString("id-ID")}%`;
}
