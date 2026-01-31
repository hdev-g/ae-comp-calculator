-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "appliedBonusRuleIds" JSONB NOT NULL DEFAULT '[]';
