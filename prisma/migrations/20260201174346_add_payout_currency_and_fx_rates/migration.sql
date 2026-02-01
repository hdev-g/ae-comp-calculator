-- AlterTable
ALTER TABLE "AEProfile" ADD COLUMN     "payoutCurrency" TEXT;

-- CreateTable
CREATE TABLE "FxRate" (
    "id" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FxRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FxRate_year_idx" ON "FxRate"("year");

-- CreateIndex
CREATE UNIQUE INDEX "FxRate_currencyCode_year_key" ON "FxRate"("currencyCode", "year");
