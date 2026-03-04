-- CreateTable User
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'admin',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable CompanySettings
CREATE TABLE IF NOT EXISTS "CompanySettings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyName" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "gstNo" TEXT NOT NULL,
  "panNo" TEXT NOT NULL,
  "emailFrom" TEXT NOT NULL,
  "termsConditions" TEXT NOT NULL,
  "signatureImageUrl" TEXT
);

-- CreateTable Product
CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable ProductComponent
CREATE TABLE IF NOT EXISTS "ProductComponent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "componentName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "isEditable" BOOLEAN NOT NULL DEFAULT true,
  "sacCode" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ProductComponent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable Quotation
CREATE TABLE IF NOT EXISTS "Quotation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "quotationNo" TEXT NOT NULL UNIQUE,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT NOT NULL,
  "toCompanyName" TEXT NOT NULL,
  "toAddress" TEXT NOT NULL,
  "toGstNo" TEXT,
  "toPhone" TEXT,
  "toEmail" TEXT,
  "subtotal" DOUBLE PRECISION NOT NULL,
  "gstPercent" DOUBLE PRECISION NOT NULL DEFAULT 18,
  "gstAmount" DOUBLE PRECISION NOT NULL,
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "notes" TEXT,
  "termsConditions" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable QuotationItem
CREATE TABLE IF NOT EXISTS "QuotationItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "quotationId" TEXT NOT NULL,
  "componentName" TEXT NOT NULL,
  "sacCode" TEXT,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "totalPrice" DOUBLE PRECISION NOT NULL,
  "isProductHeader" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProductComponent_productId_idx" ON "ProductComponent"("productId");

-- CreateIndex
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");
