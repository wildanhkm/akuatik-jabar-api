-- CreateTable
CREATE TABLE `publicKejurkab` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_number` VARCHAR(191) NOT NULL,
    `registration_number` VARCHAR(191) NOT NULL,
    `registrant_name` VARCHAR(191) NOT NULL,
    `event_name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `publicKejurkab_invoice_number_key`(`invoice_number`),
    UNIQUE INDEX `publicKejurkab_registration_number_key`(`registration_number`),
    UNIQUE INDEX `publicKejurkab_email_key`(`email`),
    UNIQUE INDEX `publicKejurkab_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `publicInvoice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_number` VARCHAR(191) NOT NULL,
    `billed_to` VARCHAR(191) NOT NULL,
    `invoice_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `publicInvoice_invoice_number_key`(`invoice_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `publicKejurkab` ADD CONSTRAINT `publicKejurkab_invoice_number_fkey` FOREIGN KEY (`invoice_number`) REFERENCES `publicInvoice`(`invoice_number`) ON DELETE RESTRICT ON UPDATE CASCADE;
