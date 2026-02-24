/*
  Warnings:

  - You are about to alter the column `unitPrice` on the `CartItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `totalAmount` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `unitPrice` on the `OrderItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - Added the required column `contactName` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `CartItem` MODIFY `unitPrice` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `Order` ADD COLUMN `contactEmail` VARCHAR(191) NULL,
    ADD COLUMN `contactName` VARCHAR(191) NOT NULL,
    MODIFY `totalAmount` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `OrderItem` MODIFY `unitPrice` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `Product` MODIFY `description` VARCHAR(191) NULL;
