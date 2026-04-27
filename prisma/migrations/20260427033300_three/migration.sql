/*
  Warnings:

  - You are about to drop the column `commonName` on the `plants` table. All the data in the column will be lost.
  - You are about to drop the column `priceInCents` on the `plants` table. All the data in the column will be lost.
  - The `careInstructions` column on the `plants` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `name` to the `plants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `plants` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "plants" DROP COLUMN "commonName",
DROP COLUMN "priceInCents",
ADD COLUMN     "name" VARCHAR(255) NOT NULL,
ADD COLUMN     "price" INTEGER NOT NULL,
ADD COLUMN     "priceActive" BOOLEAN NOT NULL DEFAULT true,
DROP COLUMN "careInstructions",
ADD COLUMN     "careInstructions" JSONB;
