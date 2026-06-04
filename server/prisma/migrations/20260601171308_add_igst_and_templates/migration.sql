-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "transportType" TEXT DEFAULT 'By Road',
    "buyerName" TEXT NOT NULL,
    "buyerGst" TEXT,
    "buyerCin" TEXT,
    "buyerAddress" TEXT,
    "buyerState" TEXT DEFAULT 'Maharashtra',
    "buyerStateCode" TEXT DEFAULT '27',
    "consigneeName" TEXT,
    "consigneeGst" TEXT,
    "consigneeAddress" TEXT,
    "consigneeState" TEXT DEFAULT 'Maharashtra',
    "consigneeStateCode" TEXT DEFAULT '27',
    "templateType" TEXT NOT NULL DEFAULT 'A',
    "subtotal" REAL NOT NULL DEFAULT 0,
    "transportTotal" REAL NOT NULL DEFAULT 0,
    "taxableAmount" REAL NOT NULL DEFAULT 0,
    "cgstRate" REAL NOT NULL DEFAULT 2.5,
    "sgstRate" REAL NOT NULL DEFAULT 2.5,
    "cgstAmount" REAL NOT NULL DEFAULT 0,
    "sgstAmount" REAL NOT NULL DEFAULT 0,
    "igstRate" REAL NOT NULL DEFAULT 0,
    "igstAmount" REAL NOT NULL DEFAULT 0,
    "grandTotal" REAL NOT NULL DEFAULT 0,
    "amountInWords" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "pdfPath" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoices_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "invoices_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_invoices" ("amountInWords", "buyerAddress", "buyerGst", "buyerName", "buyerState", "buyerStateCode", "cgstAmount", "cgstRate", "clientId", "createdAt", "createdBy", "driverId", "grandTotal", "id", "invoiceDate", "invoiceNumber", "isActive", "notes", "paidAmount", "pdfPath", "sgstAmount", "sgstRate", "status", "subtotal", "taxableAmount", "transportTotal", "transportType", "updatedAt", "vehicleId") SELECT "amountInWords", "buyerAddress", "buyerGst", "buyerName", "buyerState", "buyerStateCode", "cgstAmount", "cgstRate", "clientId", "createdAt", "createdBy", "driverId", "grandTotal", "id", "invoiceDate", "invoiceNumber", "isActive", "notes", "paidAmount", "pdfPath", "sgstAmount", "sgstRate", "status", "subtotal", "taxableAmount", "transportTotal", "transportType", "updatedAt", "vehicleId" FROM "invoices";
DROP TABLE "invoices";
ALTER TABLE "new_invoices" RENAME TO "invoices";
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
