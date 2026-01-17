-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('AE', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AEProfileStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "QuarterlyStatementStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "googleSub" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'AE',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AEProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "annualCommissionAmount" DECIMAL(65,30),
    "attioWorkspaceMemberId" TEXT,
    "status" "AEProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AEProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "effectiveStartDate" TIMESTAMP(3) NOT NULL,
    "effectiveEndDate" TIMESTAMP(3),
    "baseCommissionRate" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonusRule" (
    "id" TEXT NOT NULL,
    "commissionPlanId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rateAdd" DECIMAL(65,30) NOT NULL,
    "criteriaJson" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BonusRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "attioRecordId" TEXT NOT NULL,
    "aeProfileId" TEXT,
    "dealName" TEXT NOT NULL,
    "accountName" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "commissionableAmount" DECIMAL(65,30) NOT NULL,
    "closeDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "termLengthMonths" INTEGER,
    "isMultiYear" BOOLEAN NOT NULL DEFAULT false,
    "hasTestimonialCommitment" BOOLEAN NOT NULL DEFAULT false,
    "hasMarketingCommitment" BOOLEAN NOT NULL DEFAULT false,
    "rawAttioPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuarterlyStatement" (
    "id" TEXT NOT NULL,
    "aeProfileId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "status" "QuarterlyStatementStatus" NOT NULL DEFAULT 'DRAFT',
    "lockedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "totalCommission" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalClosedWonAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuarterlyStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatementLineItem" (
    "id" TEXT NOT NULL,
    "quarterlyStatementId" TEXT NOT NULL,
    "dealId" TEXT,
    "appliedBaseRate" DECIMAL(65,30) NOT NULL,
    "appliedBonusBreakdownJson" JSONB NOT NULL,
    "appliedTotalRate" DECIMAL(65,30) NOT NULL,
    "commissionableAmount" DECIMAL(65,30) NOT NULL,
    "commissionAmount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatementLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "detailsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AEProfile_userId_key" ON "AEProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AEProfile_attioWorkspaceMemberId_key" ON "AEProfile"("attioWorkspaceMemberId");

-- CreateIndex
CREATE INDEX "AEProfile_status_idx" ON "AEProfile"("status");

-- CreateIndex
CREATE INDEX "CommissionPlan_effectiveStartDate_effectiveEndDate_idx" ON "CommissionPlan"("effectiveStartDate", "effectiveEndDate");

-- CreateIndex
CREATE INDEX "BonusRule_commissionPlanId_enabled_idx" ON "BonusRule"("commissionPlanId", "enabled");

-- CreateIndex
CREATE INDEX "BonusRule_type_idx" ON "BonusRule"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_attioRecordId_key" ON "Deal"("attioRecordId");

-- CreateIndex
CREATE INDEX "Deal_aeProfileId_closeDate_idx" ON "Deal"("aeProfileId", "closeDate");

-- CreateIndex
CREATE INDEX "Deal_status_idx" ON "Deal"("status");

-- CreateIndex
CREATE INDEX "QuarterlyStatement_status_idx" ON "QuarterlyStatement"("status");

-- CreateIndex
CREATE UNIQUE INDEX "QuarterlyStatement_aeProfileId_year_quarter_key" ON "QuarterlyStatement"("aeProfileId", "year", "quarter");

-- CreateIndex
CREATE INDEX "StatementLineItem_quarterlyStatementId_idx" ON "StatementLineItem"("quarterlyStatementId");

-- CreateIndex
CREATE INDEX "StatementLineItem_dealId_idx" ON "StatementLineItem"("dealId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- AddForeignKey
ALTER TABLE "AEProfile" ADD CONSTRAINT "AEProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusRule" ADD CONSTRAINT "BonusRule_commissionPlanId_fkey" FOREIGN KEY ("commissionPlanId") REFERENCES "CommissionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_aeProfileId_fkey" FOREIGN KEY ("aeProfileId") REFERENCES "AEProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterlyStatement" ADD CONSTRAINT "QuarterlyStatement_aeProfileId_fkey" FOREIGN KEY ("aeProfileId") REFERENCES "AEProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarterlyStatement" ADD CONSTRAINT "QuarterlyStatement_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatementLineItem" ADD CONSTRAINT "StatementLineItem_quarterlyStatementId_fkey" FOREIGN KEY ("quarterlyStatementId") REFERENCES "QuarterlyStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatementLineItem" ADD CONSTRAINT "StatementLineItem_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
