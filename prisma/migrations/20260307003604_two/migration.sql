/*
  Warnings:

  - Added the required column `description` to the `nurseries` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "nurseries" ADD COLUMN     "description" VARCHAR(500) NOT NULL;
