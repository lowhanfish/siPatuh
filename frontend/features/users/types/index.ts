import type { UserRole } from "@/features/auth/types";

export type Role = UserRole;

export type UserIdentity = {
  user_id: string;
  username: string;
  nama: string;
  nip: string | null;
  email: string | null;
  unit_kerja: string | null;
  instansi: string | null;
  jabatan: string | null;
};

export type Irban = {
  id: string;
  kode: string;
  nama: string;
  keterangan: string | null;
  created_at: string;
  updated_at: string;
};

export type SipatuhUser = {
  id: string;
  egov_user_id: string;
  role: Role;
  irban_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  irban?: Irban | null;
  identity?: UserIdentity | null;
};

export type EgovCandidateUser = {
  id: string;
  egov_user_id?: string;
  username: string;
  nama: string;
  nip: string | null;
  email: string | null;
  unit_kerja: string | null;
  instansi?: string | null;
  jabatan?: string | null;
  is_registered: boolean;
  sipatuh_role: Role | null;
  sipatuh_is_active: boolean | null;
};

export type ActivateUserInput = {
  egov_user_id: string;
  role: Role;
  irban_id?: string | null;
};

export type UpdateUserInput = {
  role?: Role;
  irban_id?: string | null;
};

export type ToggleUserStatusInput = {
  is_active: boolean;
};

export type UpdateIrbanInput = {
  nama?: string;
  keterangan?: string;
};

export type UserFilterParams = {
  role?: Role;
  irban_id?: string;
  is_active?: boolean;
  search?: string;
};
