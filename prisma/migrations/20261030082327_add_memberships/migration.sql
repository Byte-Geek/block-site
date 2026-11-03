-- CreateTable
CREATE TABLE "memberships" (
    "userId" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_groupKey_fkey" FOREIGN KEY ("groupKey") REFERENCES "groups"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
