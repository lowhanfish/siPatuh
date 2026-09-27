import { ForbiddenException } from '@nestjs/common';
import { RoleEnum } from '@prisma/client';
import { IrbanScopeService } from './irban-scope.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

describe('IrbanScopeService', () => {
  let service: IrbanScopeService;

  beforeEach(() => {
    service = new IrbanScopeService();
  });

  const superAdmin: AuthenticatedUser = {
    id: 'user-super',
    egov_user_id: 'egov-super',
    role: RoleEnum.SUPER_ADMIN,
    irban_id: null,
    nama: 'Inspektur Utama',
    nip: '19700101',
  };

  const adminIrban1: AuthenticatedUser = {
    id: 'user-irban1',
    egov_user_id: 'egov-irban1',
    role: RoleEnum.ADMIN_IRBAN,
    irban_id: 'irban-uuid-1',
    nama: 'Admin Wilayah 1',
    nip: '19800101',
  };

  const adminIrbanWithoutIrban: AuthenticatedUser = {
    id: 'user-irban-unassigned',
    egov_user_id: 'egov-unassigned',
    role: RoleEnum.ADMIN_IRBAN,
    irban_id: null,
    nama: 'Admin Tanpa Irban',
    nip: '19800102',
  };

  const bupati: AuthenticatedUser = {
    id: 'user-bupati',
    egov_user_id: 'egov-bupati',
    role: RoleEnum.BUPATI,
    irban_id: null,
    nama: 'Bupati Konsel',
    nip: '19650101',
  };

  describe('validateIrbanAccess', () => {
    it('SUPER_ADMIN should be allowed across any Irban', () => {
      expect(() =>
        service.validateIrbanAccess(superAdmin, 'irban-uuid-1'),
      ).not.toThrow();
      expect(() =>
        service.validateIrbanAccess(superAdmin, 'irban-uuid-2'),
      ).not.toThrow();
    });

    it('ADMIN_IRBAN should be allowed for their own Irban', () => {
      expect(() =>
        service.validateIrbanAccess(adminIrban1, 'irban-uuid-1'),
      ).not.toThrow();
    });

    it('ADMIN_IRBAN should be rejected when accessing another Irban (Cross-Irban -> 403)', () => {
      expect(() =>
        service.validateIrbanAccess(adminIrban1, 'irban-uuid-2'),
      ).toThrow(ForbiddenException);
    });

    it('ADMIN_IRBAN without irban_id should be rejected with 403', () => {
      expect(() =>
        service.validateIrbanAccess(adminIrbanWithoutIrban, 'irban-uuid-1'),
      ).toThrow(ForbiddenException);
    });

    it('BUPATI should be allowed for read access but rejected for write access', () => {
      expect(() =>
        service.validateIrbanAccess(bupati, 'irban-uuid-1', 'READ'),
      ).not.toThrow();
      expect(() =>
        service.validateIrbanAccess(bupati, 'irban-uuid-1', 'WRITE'),
      ).toThrow(ForbiddenException);
    });
  });

  describe('resolveEffectiveIrbanId', () => {
    it('ADMIN_IRBAN must always return their assigned irban_id, ignoring client request override', () => {
      const result = service.resolveEffectiveIrbanId(
        adminIrban1,
        'client-attempted-irban-2',
      );
      expect(result).toBe('irban-uuid-1');
    });

    it('SUPER_ADMIN can specify an irban_id filter or get undefined', () => {
      expect(service.resolveEffectiveIrbanId(superAdmin, 'irban-uuid-2')).toBe(
        'irban-uuid-2',
      );
      expect(
        service.resolveEffectiveIrbanId(superAdmin, undefined),
      ).toBeUndefined();
    });

    it('BUPATI can filter or get undefined for read queries', () => {
      expect(service.resolveEffectiveIrbanId(bupati, 'irban-uuid-3')).toBe(
        'irban-uuid-3',
      );
      expect(service.resolveEffectiveIrbanId(bupati)).toBeUndefined();
    });
  });

  describe('assertCanMutate', () => {
    it('should throw ForbiddenException if user is BUPATI', () => {
      expect(() => service.assertCanMutate(bupati)).toThrow(ForbiddenException);
    });

    it('should allow SUPER_ADMIN and ADMIN_IRBAN', () => {
      expect(() => service.assertCanMutate(superAdmin)).not.toThrow();
      expect(() => service.assertCanMutate(adminIrban1)).not.toThrow();
    });
  });
});
