/*
  Warnings:

  - You are about to drop the `groups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `memberships` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "memberships" DROP CONSTRAINT "memberships_groupKey_fkey";

-- DropForeignKey
ALTER TABLE "memberships" DROP CONSTRAINT "memberships_userId_fkey";

-- DropTable
DROP TABLE "groups";

-- DropTable
DROP TABLE "memberships";
