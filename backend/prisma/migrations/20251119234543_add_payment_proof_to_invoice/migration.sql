/*
  Warnings:

  - A unique constraint covering the columns `[paymentProofUploadId]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "paymentProofReviewedAt" TIMESTAMP(3),
ADD COLUMN     "paymentProofReviewedBy" INTEGER,
ADD COLUMN     "paymentProofUploadId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_paymentProofUploadId_key" ON "Invoice"("paymentProofUploadId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paymentProofUploadId_fkey" FOREIGN KEY ("paymentProofUploadId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paymentProofReviewedBy_fkey" FOREIGN KEY ("paymentProofReviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
