-- UserAccess hanya menyimpan otorisasi SIPATUH.
-- Kredensial tetap di EGOV dan biodata tetap di SIMPEG.
ALTER TABLE `User` DROP FOREIGN KEY `User_irban_id_fkey`;

RENAME TABLE `User` TO `UserAccess`;

ALTER TABLE `UserAccess`
  DROP COLUMN `nip`,
  DROP COLUMN `nama`,
  RENAME INDEX `User_egov_user_id_key` TO `UserAccess_egov_user_id_key`,
  RENAME INDEX `User_role_idx` TO `UserAccess_role_idx`,
  RENAME INDEX `User_irban_id_idx` TO `UserAccess_irban_id_idx`;

ALTER TABLE `UserAccess`
  ADD CONSTRAINT `UserAccess_irban_id_fkey`
  FOREIGN KEY (`irban_id`) REFERENCES `Irban`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
