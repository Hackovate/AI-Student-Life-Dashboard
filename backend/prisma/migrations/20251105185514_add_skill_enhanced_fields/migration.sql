-- AlterTable
ALTER TABLE "skills" ADD COLUMN     "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "durationMonths" INTEGER,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "estimatedHours" DOUBLE PRECISION,
ADD COLUMN     "goalStatement" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3);
