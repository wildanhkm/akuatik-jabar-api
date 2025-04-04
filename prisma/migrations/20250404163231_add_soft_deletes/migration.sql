/*
  Warnings:

  - You are about to drop the `Club` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Club` DROP FOREIGN KEY `Club_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `ClubMember` DROP FOREIGN KEY `ClubMember_club_id_fkey`;

-- DropForeignKey
ALTER TABLE `EventRegistration` DROP FOREIGN KEY `EventRegistration_club_id_fkey`;

-- DropForeignKey
ALTER TABLE `Invoice` DROP FOREIGN KEY `Invoice_club_id_fkey`;

-- DropIndex
DROP INDEX `ClubMember_club_id_fkey` ON `ClubMember`;

-- DropIndex
DROP INDEX `EventRegistration_club_id_fkey` ON `EventRegistration`;

-- DropIndex
DROP INDEX `Invoice_club_id_fkey` ON `Invoice`;

-- DropTable
DROP TABLE `Club`;

-- CreateTable
CREATE TABLE `clubs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `clubs_user_id_key`(`user_id`),
    INDEX `clubs_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `clubs` ADD CONSTRAINT `clubs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClubMember` ADD CONSTRAINT `ClubMember_club_id_fkey` FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventRegistration` ADD CONSTRAINT `EventRegistration_club_id_fkey` FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_club_id_fkey` FOREIGN KEY (`club_id`) REFERENCES `clubs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
