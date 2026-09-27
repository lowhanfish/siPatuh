import { RoleEnum } from '@prisma/client';

export interface JwtPayload {
  sub: string; // SIPATUH local UserAccess.id
  egov_user_id: string;
  role: RoleEnum;
  irban_id: string | null;
  nama: string;
  nip: string | null;
  type?: 'access' | 'refresh';
}

export interface AuthenticatedUser {
  id: string;
  egov_user_id: string;
  role: RoleEnum;
  irban_id: string | null;
  nama: string;
  nip: string | null;
}
