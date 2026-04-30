/*
  Warnings:

  - Added the required column `description` to the `nurseries` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Add with a temporary default so existing rows don't violate NOT NULL,
-- then remove the default so future inserts must provide a value explicitly.
ALTER TABLE "nurseries" ADD COLUMN "description" VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE "nurseries" ALTER COLUMN "description" DROP DEFAULT;
