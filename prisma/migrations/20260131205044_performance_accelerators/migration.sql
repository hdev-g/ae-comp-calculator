-- CreateTable
CREATE TABLE "PerformanceAccelerator" (
    "id" TEXT NOT NULL,
    "commissionPlanId" TEXT NOT NULL,
    "minAttainment" DECIMAL(65,30) NOT NULL,
    "maxAttainment" DECIMAL(65,30),
    "commissionRate" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceAccelerator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PerformanceAccelerator_commissionPlanId_idx" ON "PerformanceAccelerator"("commissionPlanId");

-- AddForeignKey
ALTER TABLE "PerformanceAccelerator" ADD CONSTRAINT "PerformanceAccelerator_commissionPlanId_fkey" FOREIGN KEY ("commissionPlanId") REFERENCES "CommissionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
