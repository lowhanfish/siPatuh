import type { DashboardIrbanMetrics } from "../types";
import { formatPercent } from "../utils/formatters";
import "./completion-chart.css";

type CompletionMetrics = Pick<DashboardIrbanMetrics,
  "total_lhp" | "total_temuan" | "total_rekomendasi" | "rekomendasi_selesai" | "rekomendasi_belum_selesai"
>;

/** Data remains available as text; depth is decorative and never changes proportions. */
export function CompletionChart({ metrics, tahun }: { metrics: CompletionMetrics; tahun: number }) {
  const total = Math.max(0, metrics.total_rekomendasi);
  const completed = Math.max(0, metrics.rekomendasi_selesai);
  const pending = Math.max(0, metrics.rekomendasi_belum_selesai);
  const percent = total > 0 ? Math.min(100, completed / total * 100) : 0;
  const series = [
    { label: "Total rekomendasi", value: total, tone: "total" },
    { label: "Selesai", value: completed, tone: "completed" },
    { label: "Belum selesai", value: pending, tone: "pending" },
  ];
  const activity = [
    { label: "Dokumen LHP", value: Math.max(0, metrics.total_lhp), tone: "total" },
    { label: "Temuan", value: Math.max(0, metrics.total_temuan), tone: "pending" },
    { label: "Rekomendasi", value: total, tone: "completed" },
  ];
  const maximum = Math.max(...activity.map((item) => item.value), 1);

  return (
    <figure className="completion-chart rounded-2xl border border-line bg-surface shadow-card">
      <figcaption className="completion-heading">
        <div><span className="eyebrow">Progres pengawasan</span><h3>Aktivitas & tindak lanjut</h3><p>Ringkasan tindak lanjut tahun {tahun}</p></div>
        <span className="completion-year">{tahun}</span>
      </figcaption>
      {total === 0 && (
        <p className="completion-empty">Belum ada data rekomendasi pada tahun {tahun}.</p>
      )}
        <div className="completion-body">
          <div className="completion-donut">
            <svg viewBox="0 0 240 240" aria-hidden="true">
              <g transform="translate(0 10)"><circle cx="120" cy="120" r="83" fill="none" stroke={total > 0 ? "#224b42" : "#202d3d"} strokeWidth="28" /></g>
              <circle cx="120" cy="120" r="83" fill="none" stroke={total > 0 ? "#7db9a9" : "#334357"} strokeWidth="28" />
              <circle cx="120" cy="120" r="83" fill="none" stroke="#e8c48a" strokeWidth="28" pathLength="100" strokeDasharray={`${percent} ${100 - percent}`} transform="rotate(-90 120 120)" className="completion-arc" />
              <circle cx="120" cy="120" r="65" fill="#111c29" stroke="#ffffff0d" />
            </svg>
            <div className="completion-center"><strong>{total > 0 ? formatPercent(percent) : "—"}</strong><span>{total > 0 ? "rekomendasi selesai" : "belum ada rekomendasi"}</span></div>
          </div>
          <div className="completion-bars" role="img" aria-label={`Volume pengawasan: ${activity.map((item) => `${item.value} ${item.label}`).join(", ")}.`}>
            <div className="completion-grid" />
            {activity.map((item) => (
              <div className={`completion-column ${item.tone}`} key={item.tone}>
                <div className="completion-bar-track"><div className={`completion-bar ${item.value === 0 ? "is-zero" : ""}`} style={{ height: `${item.value / maximum * 100}%` }}><span>{item.value.toLocaleString("id-ID")}</span></div></div>
                <span className="completion-bar-label">{item.label}</span>
              </div>
            ))}
          </div>
          <dl className="completion-legend">
            {series.map((item) => (
              <div key={item.tone}><dt><i className={item.tone} aria-hidden="true" />{item.label}</dt><dd>{item.value.toLocaleString("id-ID")}</dd></div>
            ))}
            <div className="completion-summary"><dt>Tingkat penyelesaian</dt><dd>{total > 0 ? formatPercent(percent) : "—"}</dd></div>
          </dl>
        </div>
    </figure>
  );
}
