import type { StatusRekomendasi } from "@/features/master-data/types";

export type AttachmentItem = {
  id: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};

export type VerifikasiItem = {
  id: string;
  tindak_lanjut_id: string;
  catatan: string;
  status_rekomendasi_id: string;
  status_rekomendasi: StatusRekomendasi;
  verified_by: string;
  verifier: {
    id: string;
    egov_user_id: string;
    role: string;
  };
  verified_at: string;
  attachments?: AttachmentItem[];
};

export type TindakLanjutItem = {
  id: string;
  rekomendasi_id: string;
  tanggal_diterima: string;
  uraian: string;
  nilai_tindak_lanjut?: number | string | null;
  created_by: string;
  created_by_user?: {
    id: string;
    egov_user_id: string;
    role: string;
  } | null;
  verifikasis: VerifikasiItem[];
  attachments: AttachmentItem[];
  created_at: string;
  updated_at: string;
};

export type FinancialSummary = {
  rekomendasi_id: string;
  nilai_rekomendasi: number | null;
  total_tindak_lanjut: number;
  sisa: number | null;
  persentase: number | null;
  status_saat_ini: string;
  kategori_status: "SELESAI" | "BELUM_SELESAI";
};
