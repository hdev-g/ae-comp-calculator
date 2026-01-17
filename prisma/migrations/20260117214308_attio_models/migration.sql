-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "attioOwnerWorkspaceMemberId" TEXT;

-- CreateTable
CREATE TABLE "AttioWorkspaceMember" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "fullName" TEXT,
    "status" TEXT,
    "rawAttioPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttioWorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttioWorkspaceMember_email_key" ON "AttioWorkspaceMember"("email");

-- CreateIndex
CREATE INDEX "AttioWorkspaceMember_email_idx" ON "AttioWorkspaceMember"("email");

-- CreateIndex
CREATE INDEX "Deal_attioOwnerWorkspaceMemberId_closeDate_idx" ON "Deal"("attioOwnerWorkspaceMemberId", "closeDate");
