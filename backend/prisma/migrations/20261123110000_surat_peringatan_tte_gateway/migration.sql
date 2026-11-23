-- Kolom transaksi gateway TTE Esign Konsel (Idempotency-Key, request_id, status).
-- AlterTable
ALTER TABLE `SuratPeringatan` ADD COLUMN `tte_attempted_at` DATETIME(3) NULL,
    ADD COLUMN `tte_error_code` VARCHAR(100) NULL,
    ADD COLUMN `tte_idempotency_key` VARCHAR(128) NULL,
    ADD COLUMN `tte_request_id` VARCHAR(64) NULL,
    ADD COLUMN `tte_status` VARCHAR(20) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `SuratPeringatan_tte_request_id_key` ON `SuratPeringatan`(`tte_request_id`);

