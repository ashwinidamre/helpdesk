-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "resolvedByAi" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "status" SET DEFAULT 'NEW';
