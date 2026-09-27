export type KategoriStatusRekomendasi = "SELESAI" | "BELUM_SELESAI";

export type JenisPemeriksaan = {
  id: string;
  nama: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type StatusRekomendasi = {
  id: string;
  nama: string;
  kategori: KategoriStatusRekomendasi;
  urutan: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SuratTemplate = {
  id: string;
  jenis_surat: string;
  judul: string;
  konten_html: string;
  versi: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateJenisPemeriksaanInput = {
  nama: string;
};

export type UpdateJenisPemeriksaanInput = {
  nama?: string;
  is_active?: boolean;
};

export type CreateStatusRekomendasiInput = {
  nama: string;
  kategori: KategoriStatusRekomendasi;
  urutan?: number;
};

export type UpdateStatusRekomendasiInput = {
  nama?: string;
  kategori?: KategoriStatusRekomendasi;
  urutan?: number;
  is_active?: boolean;
};

export type CreateSuratTemplateInput = {
  jenis_surat: string;
  judul: string;
  konten_html: string;
};

export type UpdateSuratTemplateInput = {
  judul?: string;
  konten_html?: string;
  is_active?: boolean;
};
