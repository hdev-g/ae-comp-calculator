-- AlterTable
ALTER TABLE "AEProfile" ADD COLUMN     "commissionPlanId" TEXT;

-- CreateIndex
CREATE INDEX "AEProfile_commissionPlanId_idx" ON "AEProfile"("commissionPlanId");

-- AddForeignKey
ALTER TABLE "AEProfile" ADD CONSTRAINT "AEProfile_commissionPlanId_fkey" FOREIGN KEY ("commissionPlanId") REFERENCES "CommissionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
