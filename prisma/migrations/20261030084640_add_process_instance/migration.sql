/*
  Warnings:

  - A unique constraint covering the columns `[processInstanceId]` on the table `cases` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "processInstanceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "cases_processInstanceId_key" ON "cases"("processInstanceId");
