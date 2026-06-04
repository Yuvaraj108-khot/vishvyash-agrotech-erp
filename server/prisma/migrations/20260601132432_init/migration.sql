-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "gstNumber" TEXT,
    "cinNumber" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT DEFAULT 'Maharashtra',
    "pincode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "contactPerson" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "address" TEXT,
    "licenseNumber" TEXT,
    "aadhaarNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleNumber" TEXT NOT NULL,
    "vehicleType" TEXT,
    "ownerName" TEXT,
    "driverId" TEXT,
    "insuranceExpiry" DATETIME,
    "fitnessExpiry" DATETIME,
    "permitExpiry" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vehicles_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" DATETIME NOT NULL,
    "clientId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "transportType" TEXT DEFAULT 'By Road',
    "buyerName" TEXT NOT NULL,
    "buyerGst" TEXT,
    "buyerAddress" TEXT,
    "buyerState" TEXT DEFAULT 'Maharashtra',
    "buyerStateCode" TEXT DEFAULT '27',
    "subtotal" REAL NOT NULL DEFAULT 0,
    "transportTotal" REAL NOT NULL DEFAULT 0,
    "taxableAmount" REAL NOT NULL DEFAULT 0,
    "cgstRate" REAL NOT NULL DEFAULT 2.5,
    "sgstRate" REAL NOT NULL DEFAULT 2.5,
    "cgstAmount" REAL NOT NULL DEFAULT 0,
    "sgstAmount" REAL NOT NULL DEFAULT 0,
    "grandTotal" REAL NOT NULL DEFAULT 0,
    "amountInWords" TEXT,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
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

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT 'Biomass Briquettes',
    "hsnCode" TEXT NOT NULL DEFAULT '4401',
    "quantity" REAL NOT NULL,
    "ratePerTon" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "transportRate" REAL NOT NULL DEFAULT 0,
    "transportAmount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "chequeNumber" TEXT,
    "utrNumber" TEXT,
    "referenceNo" TEXT,
    "bankName" TEXT,
    "remarks" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "password_reset_otps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_otps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vehicleNumber_key" ON "vehicles"("vehicleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");
