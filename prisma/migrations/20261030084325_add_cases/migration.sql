-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_domains" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "case_domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cases_number_key" ON "cases"("number");

-- CreateIndex
CREATE INDEX "case_domains_caseId_idx" ON "case_domains"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "case_domains_caseId_value_key" ON "case_domains"("caseId", "value");

-- AddForeignKey
ALTER TABLE "case_domains" ADD CONSTRAINT "case_domains_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
