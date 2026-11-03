-- CreateTable
CREATE TABLE "case_comments" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_comments_caseId_idx" ON "case_comments"("caseId");

-- AddForeignKey
ALTER TABLE "case_comments" ADD CONSTRAINT "case_comments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
