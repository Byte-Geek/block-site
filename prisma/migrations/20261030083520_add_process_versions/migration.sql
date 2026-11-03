-- CreateTable
CREATE TABLE "process_versions" (
    "id" TEXT NOT NULL,
    "xml" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "process_versions_pkey" PRIMARY KEY ("id")
);
