export type StatusCountItem = {
  status_id: string;
  nama: string;
  kategori: string;
  count: number;
};

export type OpdReportSummaryItem = {
  simpeg_unit_kerja_id: string;
  nama_opd: string;
  irban_nama: string;
  total_lhp: number;
  total_temuan: number;
  total_rekomendasi: number;
  selesai: number;
  belum_selesai: number;
  persen_selesai: number;
  nilai_rekomendasi: number;
  nilai_setor: number;
  sisa_rekomendasi: number;
};

export type ReportMetrics = {
  total_lhp: number;
  lhp_open: number;
  lhp_closed: number;
  total_temuan: number;
  total_rekomendasi: number;
  rekomendasi_selesai: number;
  rekomendasi_belum_selesai: number;
  persentase_selesai: number;
  total_nilai_temuan: number;
  total_nilai_rekomendasi: number;
  total_nilai_setor: number;
  sisa_nilai_rekomendasi: number;
  persentase_keuangan_selesai: number;
};

export type ReportSummaryResponse = {
  tahun: number;
  filter_applied: {
    irban_id?: string;
    simpeg_unit_kerja_id?: string;
    jenis_pemeriksaan_id?: string;
    status_rekomendasi_id?: string;
  };
  metrics: ReportMetrics;
  status_breakdown: StatusCountItem[];
  opd_breakdown: OpdReportSummaryItem[];
};

export type ReportFilterParams = {
  tahun?: string;
  irban_id?: string;
  simpeg_unit_kerja_id?: string;
  jenis_pemeriksaan_id?: string;
  status_rekomendasi_id?: string;
};
