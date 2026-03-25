-- CreateEnum
CREATE TYPE "BonusType" AS ENUM ('CLASSEMENT', 'SOLDE_MAX', 'SOLDE_MOYEN', 'GAIN_DOUBLE', 'VOL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'BONUS_STEAL_GAIN';
ALTER TYPE "TransactionType" ADD VALUE 'BONUS_STEAL_LOSS';

-- CreateTable
CREATE TABLE "BonusUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bonusType" "BonusType" NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "data" JSONB,

    CONSTRAINT "BonusUsage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BonusUsage" ADD CONSTRAINT "BonusUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
