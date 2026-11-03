-- CreateTable
CREATE TABLE "isp_responses" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "isp_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "isp_responses_caseId_userId_idx" ON "isp_responses"("caseId", "userId");

-- AddForeignKey
ALTER TABLE "isp_responses" ADD CONSTRAINT "isp_responses_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
