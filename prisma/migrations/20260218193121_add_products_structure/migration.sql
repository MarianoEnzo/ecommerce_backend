/*
  Warnings:

  - The values [REMERA,BUZO,CAMPERA,PANTALON,CALZADO] on the enum `Product_category` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `Product` MODIFY `category` ENUM('TSHIRT', 'SWEATSHIRT', 'JACKET', 'PANTS', 'SHOES') NOT NULL;
