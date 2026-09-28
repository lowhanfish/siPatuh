export type SpLevel = "SP1" | "SP2" | "SP3";

export type OutstandingRekomendasiSnapshot = {
  id: string;
  temuan_id: string;
  nomor_urut: number;
  uraian: string;
  nilai_rekomendasi: number | null;
  status_nama: string;
  status_kategori: "SELESAI" | "BELUM_SELESAI";
};

export type SpEligibilityResult = {
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
  outstanding_rekomendasis: OutstandingRekomendasiSnapshot[];
  existing_sp_levels: SpLevel[];
  eligible_level: SpLevel | null;
  is_due: boolean;
  next_threshold_days?: number;
};

export type SuratPeringatanItem = {
  id: string;
  lhp_id: string;
  level: SpLevel;
  nomor_surat: string;
  tanggal_surat: string;
  simpeg_unit_kerja_id: string;
  unit_kerja_nama: string;
  recipient_nip?: string | null;
  recipient_nama?: string | null;
  recipient_jabatan?: string | null;
  template_version?: number;
  draft_path?: string | null;
  signed_at?: string | null;
  signed_by?: string | null;
  signed_path?: string | null;
  items_count: number;
  created_at: string;
  updated_at: string;
  lhp: {
    id: string;
    nomor_lhp: string;
    irban_id: string;
    simpeg_unit_kerja_id: string;
    tanggal_lhp: string;
    tanggal_diterima_lhp: string;
    closed_at?: string | null;
  };
};

export type SuratPeringatanDetailItem = {
  id: string;
  surat_peringatan_id: string;
  rekomendasi_id: string;
  uraian_snapshot: string;
  nilai_rekomendasi_snapshot?: number | null;
};

export type SuratPeringatanDetail = SuratPeringatanItem & {
  items: SuratPeringatanDetailItem[];
};

export type CreateSuratPeringatanInput = {
  lhp_id: string;
  level: SpLevel;
  nomor_surat: string;
  tanggal_surat: string;
  pejabat_id?: string;
  template_id?: string;
};

export type SignTteInput = {
  nik: string;
  passphrase: string;
};

export type SuratPeringatanFilterParams = {
  lhp_id?: string;
  level?: SpLevel | "";
  irban_id?: string;
  tahun?: string;
  search?: string;
};
