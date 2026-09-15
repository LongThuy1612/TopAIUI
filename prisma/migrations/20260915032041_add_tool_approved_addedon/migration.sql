-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "addedOn" TIMESTAMP(3),
ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT false;
