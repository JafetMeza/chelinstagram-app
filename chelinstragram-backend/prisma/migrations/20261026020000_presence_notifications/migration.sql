-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "notifyOnlineEnabled" BOOLEAN NOT NULL DEFAULT true;
