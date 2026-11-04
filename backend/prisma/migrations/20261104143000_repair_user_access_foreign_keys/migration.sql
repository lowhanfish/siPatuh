-- Repair legacy references left behind after User was renamed to UserAccess.
-- Preserves all records and the original referential actions.
ALTER TABLE `TindakLanjut`
  DROP FOREIGN KEY `TindakLanjut_created_by_fkey`;
ALTER TABLE `TindakLanjut`
  ADD CONSTRAINT `TindakLanjut_created_by_fkey` FOREIGN KEY (`created_by`)
    REFERENCES `UserAccess`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `AuditLog`
  DROP FOREIGN KEY `AuditLog_actor_id_fkey`;
ALTER TABLE `AuditLog`
  ADD CONSTRAINT `AuditLog_actor_id_fkey` FOREIGN KEY (`actor_id`)
    REFERENCES `UserAccess`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Lhp`
  DROP FOREIGN KEY `Lhp_closed_by_fkey`;
ALTER TABLE `Lhp`
  ADD CONSTRAINT `Lhp_closed_by_fkey` FOREIGN KEY (`closed_by`)
    REFERENCES `UserAccess`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `SuratPeringatan`
  DROP FOREIGN KEY `SuratPeringatan_signed_by_fkey`;
ALTER TABLE `SuratPeringatan`
  ADD CONSTRAINT `SuratPeringatan_signed_by_fkey` FOREIGN KEY (`signed_by`)
    REFERENCES `UserAccess`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Verifikasi`
  DROP FOREIGN KEY `Verifikasi_verifier_id_fkey`;
ALTER TABLE `Verifikasi`
  ADD CONSTRAINT `Verifikasi_verifier_id_fkey` FOREIGN KEY (`verifier_id`)
    REFERENCES `UserAccess`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

