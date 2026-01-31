/*
  Warnings:

  - You are about to drop the column `criteriaJson` on the `BonusRule` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `BonusRule` table. All the data in the column will be lost.
  - Added the required column `name` to the `BonusRule` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "BonusRule_type_idx";

-- AlterTable
ALTER TABLE "BonusRule" DROP COLUMN "criteriaJson",
DROP COLUMN "type",
ADD COLUMN     "effectiveEndDate" TIMESTAMP(3),
ADD COLUMN     "effectiveStartDate" TIMESTAMP(3),
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "BonusRule_name_idx" ON "BonusRule"("name");
