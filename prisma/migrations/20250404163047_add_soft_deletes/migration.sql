/*
  Warnings:

  - You are about to drop the column `deleted_at` on the `Official` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Club` ADD COLUMN `deleted_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Official` DROP COLUMN `deleted_at`;
