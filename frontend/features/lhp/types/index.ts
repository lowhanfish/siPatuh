export type LhpStatusFilter = "ALL" | "OPEN" | "CLOSED";

export type LhpListItem = {
  id: string;
  nomor_lhp: string;
  tanggal_lhp: string;
  tanggal_diterima_lhp: string;
  tanggal_mulai_pemeriksaan?: string | null;
  tanggal_selesai_pemeriksaan?: string | null;
  simpeg_unit_kerja_id: string;
  irban_id: string;
  jenis_pemeriksaan_id: string;
  file_path?: string | null;
  closed_at?: string | null;
  closed_by?: string | null;
  created_at: string;
  updated_at: string;
  irban: {
    id: string;
    kode: string;
    nama: string;
  };
  jenis_pemeriksaan: {
    id: string;
    nama: string;
  };
  unit_kerja_nama: string;
  is_closed: boolean;
  _count: {
    temuans: number;
    surat_peringatans: number;
  };
};

export type LhpTemuanChild = {
  id: string;
  nomor_urut: number;
  judul: string;
  uraian: string;
  rekomendasis: Array<{
    id: string;
    nomor_urut: number;
    uraian: string;
    status_rekomendasi: {
      id: string;
      nama: string;
      kategori: "SELESAI" | "BELUM_SELESAI";
    };
    _count: {
      tindak_lanjuts: number;
    };
  }>;
};

export type LhpSuratPeringatanChild = {
  id: string;
  level: "SP1" | "SP2" | "SP3";
  nomor_surat: string;
  tanggal_surat: string;
  signed_at?: string | null;
};

export type LhpDetail = LhpListItem & {
  closed_by_user?: {
    id: string;
    egov_user_id: string;
    role: string;
  } | null;
  temuans: LhpTemuanChild[];
  surat_peringatans: LhpSuratPeringatanChild[];
};

export type LhpListMeta = {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  tahun: number | "ALL";
};

export type LhpListResponse = {
  data: LhpListItem[];
  meta: LhpListMeta;
};

export type LhpFilter = {
  tahun?: number;
  irban_id?: string;
  jenis_pemeriksaan_id?: string;
  status?: LhpStatusFilter;
  search?: string;
  page?: number;
  limit?: number;
};

export type CreateLhpInput = {
  nomor_lhp: string;
  tanggal_lhp: string;
  tanggal_diterima_lhp: string;
  tanggal_mulai_pemeriksaan?: string | null;
  tanggal_selesai_pemeriksaan?: string | null;
  simpeg_unit_kerja_id: string;
  jenis_pemeriksaan_id: string;
};

export type UpdateLhpInput = Partial<CreateLhpInput>;

export type ReopenLhpInput = {
  alasan: string;
};
