export type JenisPenugasan = "DEFINITIF" | "PLT" | "PLH";

export type AssignedIrban = {
  id: string;
  kode: string;
  nama: string;
};

export type SimpegUnitKerjaItem = {
  id: string;
  unit_kerja: string;
  instansi_id?: string;
  instansi?: string;
  is_assigned: boolean;
  mapping_id: string | null;
  assigned_irban: AssignedIrban | null;
};

export type IrbanUnitKerjaMapping = {
  id: string;
  irban_id: string;
  simpeg_unit_kerja_id: string;
  unit_kerja_nama: string;
  irban: AssignedIrban;
  created_at: string;
  updated_at: string;
};

export type PejabatUnitKerja = {
  id: string;
  simpeg_unit_kerja_id: string;
  nip: string;
  nama: string;
  jabatan: string;
  jenis_penugasan: JenisPenugasan;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ResolvedRecipientResponse = {
  primary_candidate: PejabatUnitKerja | null;
  all_candidates: PejabatUnitKerja[];
  requires_manual_selection: boolean;
};

export type AssignUnitKerjaInput = {
  simpeg_unit_kerja_id: string;
  irban_id: string;
};

export type CreatePejabatInput = {
  simpeg_unit_kerja_id: string;
  nip: string;
  nama: string;
  jabatan: string;
  jenis_penugasan: JenisPenugasan;
  tanggal_mulai: string;
  tanggal_selesai?: string | null;
  is_active?: boolean;
};

export type UpdatePejabatInput = Partial<CreatePejabatInput>;
