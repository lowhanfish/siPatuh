import type { StatusRekomendasi } from "@/features/master-data/types";

export type RekomendasiItem = {
  id: string;
  temuan_id: string;
  nomor_urut: number;
  uraian: string;
  nilai_rekomendasi?: number | string | null;
  status_rekomendasi_id: string;
  status_rekomendasi?: StatusRekomendasi | null;
  _count?: {
    tindak_lanjuts: number;
  };
  created_at: string;
  updated_at: string;
};

export type TemuanItem = {
  id: string;
  lhp_id: string;
  nomor_urut: number;
  judul: string;
  uraian: string;
  nilai_temuan?: number | string | null;
  rekomendasis: RekomendasiItem[];
  created_at: string;
  updated_at: string;
};

export type CreateTemuanInput = {
  judul: string;
  uraian: string;
  nilai_temuan?: number | null;
};

export type UpdateTemuanInput = Partial<CreateTemuanInput>;

export type CreateRekomendasiInput = {
  uraian: string;
  nilai_rekomendasi?: number | null;
  status_rekomendasi_id: string;
};

export type UpdateRekomendasiInput = Partial<CreateRekomendasiInput>;
