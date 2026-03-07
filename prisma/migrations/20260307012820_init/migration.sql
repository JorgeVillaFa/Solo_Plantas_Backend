/*
  Warnings:

  - You are about to drop the column `angle` on the `plant_genetics` table. All the data in the column will be lost.
  - You are about to drop the column `careLight` on the `plants` table. All the data in the column will be lost.
  - You are about to drop the column `careNotes` on the `plants` table. All the data in the column will be lost.
  - You are about to drop the column `careTemperature` on the `plants` table. All the data in the column will be lost.
  - You are about to drop the column `careWater` on the `plants` table. All the data in the column will be lost.
  - You are about to drop the column `ecosystemNotes` on the `plants` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `plants` table. All the data in the column will be lost.
  - Added the required column `baseThickness` to the `plant_genetics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branchAngle` to the `plant_genetics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `flowerColor` to the `plant_genetics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `flowerScale` to the `plant_genetics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leafColor` to the `plant_genetics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leafScale` to the `plant_genetics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lengthMultiplier` to the `plant_genetics` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stemColor` to the `plant_genetics` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "plant_genetics" DROP COLUMN "angle",
ADD COLUMN     "baseThickness" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "branchAngle" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "flowerColor" VARCHAR(20) NOT NULL,
ADD COLUMN     "flowerScale" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "leafColor" VARCHAR(20) NOT NULL,
ADD COLUMN     "leafScale" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "lengthMultiplier" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "stemColor" VARCHAR(20) NOT NULL;

-- AlterTable
ALTER TABLE "plants" DROP COLUMN "careLight",
DROP COLUMN "careNotes",
DROP COLUMN "careTemperature",
DROP COLUMN "careWater",
DROP COLUMN "ecosystemNotes",
DROP COLUMN "imageUrl",
ADD COLUMN     "careInstructions" TEXT,
ADD COLUMN     "dominantColor" VARCHAR(50),
ADD COLUMN     "ecologicalRole" TEXT,
ADD COLUMN     "growthMilestones" INTEGER[],
ADD COLUMN     "growthType" VARCHAR(50),
ADD COLUMN     "illustrationName" VARCHAR(255),
ADD COLUMN     "riddle" TEXT,
ADD COLUMN     "seasonCategory" VARCHAR(20);
