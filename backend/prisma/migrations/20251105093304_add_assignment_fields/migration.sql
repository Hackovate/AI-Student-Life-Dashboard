/*
  Warnings:

  - A unique constraint covering the columns `[classScheduleId,userId,date]` on the table `attendance_records` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `classScheduleId` to the `attendance_records` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "attendance_records_courseId_userId_date_key";

-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "estimatedHours" DOUBLE PRECISION,
ADD COLUMN     "startDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "attendance_records" ADD COLUMN     "classScheduleId" TEXT NOT NULL,
ALTER COLUMN "date" DROP DEFAULT;

-- AlterTable
ALTER TABLE "skills" ADD COLUMN     "certificateUrl" TEXT,
ADD COLUMN     "gradient" TEXT,
ADD COLUMN     "nextTask" TEXT,
ADD COLUMN     "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "resourceCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timeSpent" TEXT DEFAULT '0h';

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_resources" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "content" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_recommendations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT,
    "title" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "estimatedTime" TEXT,
    "reason" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_classScheduleId_userId_date_key" ON "attendance_records"("classScheduleId", "userId", "date");

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_resources" ADD CONSTRAINT "learning_resources_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_resources" ADD CONSTRAINT "learning_resources_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_classScheduleId_fkey" FOREIGN KEY ("classScheduleId") REFERENCES "class_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
