export type DashboardIrbanMetrics = {
  total_lhp: number;
  lhp_open: number;
  lhp_closed: number;
  total_temuan: number;
  total_rekomendasi: number;
  rekomendasi_selesai: number;
  rekomendasi_belum_selesai: number;
  persentase_selesai: number;
  total_nilai_rekomendasi: number;
  total_nilai_setor: number;
  sisa_nilai_rekomendasi: number;
};

export type SpAlertItem = {
  lhp_id: string;
  nomor_lhp: string;
  irban_id: string;
  simpeg_unit_kerja_id: string;
  unit_kerja_nama?: string;
  tanggal_lhp: string;
  tanggal_diterima_lhp: string;
  age_days: number;
  is_closed: boolean;
  total_rekomendasi: number;
  pending_rekomendasi_count: number;
  eligible_level: "SP1" | "SP2" | "SP3" | null;
  is_due: boolean;
  next_threshold_days?: number;
};

export type SpAlerts = {
  total_due: number;
  sp1_due: number;
  sp2_due: number;
  sp3_due: number;
  items: SpAlertItem[];
};

export type RecentLhpItem = {
  id: string;
  nomor_lhp: string;
  tanggal_lhp: string;
  closed_at: string | null;
  temuan_count: number;
  rekomendasi_count: number;
};

export type IrbanDashboardData = {
  tahun: number;
  irban: {
    id: string | null;
    nama: string;
  };
  metrics: DashboardIrbanMetrics;
  status_breakdown: Record<string, number>;
  sp_alerts: SpAlerts;
  recent_lhps: RecentLhpItem[];
};
