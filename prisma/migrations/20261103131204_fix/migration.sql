-- CreateTable
CREATE TABLE "isp_domain_results" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "blocked" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "isp_domain_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "isp_domain_results_caseId_userId_idx" ON "isp_domain_results"("caseId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "isp_domain_results_userId_domainId_key" ON "isp_domain_results"("userId", "domainId");

-- CreateIndex
CREATE INDEX "case_domains_value_idx" ON "case_domains"("value");

-- AddForeignKey
ALTER TABLE "isp_domain_results" ADD CONSTRAINT "isp_domain_results_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "isp_domain_results" ADD CONSTRAINT "isp_domain_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "isp_domain_results" ADD CONSTRAINT "isp_domain_results_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "case_domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
