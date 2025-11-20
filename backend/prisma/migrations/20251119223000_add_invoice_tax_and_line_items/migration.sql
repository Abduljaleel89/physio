-- AlterTable: Add tax and line item fields
-- First, add columns with defaults
ALTER TABLE "Invoice" ADD COLUMN     "subtotal" DECIMAL(10,2),
ADD COLUMN     "taxAmount" DECIMAL(10,2),
ADD COLUMN     "taxRate" DECIMAL(5,2),
ADD COLUMN     "taxable" BOOLEAN NOT NULL DEFAULT false;

-- Set subtotal to amount for existing invoices (backward compatibility)
UPDATE "Invoice" SET "subtotal" = "amount" WHERE "subtotal" IS NULL;

-- Now make subtotal required
ALTER TABLE "Invoice" ALTER COLUMN "subtotal" SET NOT NULL;

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
