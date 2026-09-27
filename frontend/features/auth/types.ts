export type UserRole = "SUPER_ADMIN" | "ADMIN_IRBAN" | "BUPATI";

export type IrbanSummary = {
  id: string;
  kode: string;
  nama: string;
};

export type AuthUser = {
  id: string;
  egov_user_id: string;
  nip: string | null;
  nama: string;
  role: UserRole;
  irban_id: string | null;
  irban?: IrbanSummary | null;
  is_active?: boolean;
};

export type LoginInput = {
  identifier: string;
  password: string;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};
