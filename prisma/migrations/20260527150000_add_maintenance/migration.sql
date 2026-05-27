-- CreateTable
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trade" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "company" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceJob" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "contractorId" TEXT,
    "contractorName" TEXT,
    "contractorPhone" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledFor" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "dueBy" TIMESTAMP(3),
    "estimatedCost" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "chargeToOwner" BOOLEAN NOT NULL DEFAULT false,
    "ownerStatementNote" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contractor_isActive_idx" ON "Contractor"("isActive");

-- CreateIndex
CREATE INDEX "Contractor_trade_idx" ON "Contractor"("trade");

-- CreateIndex
CREATE INDEX "MaintenanceJob_propertyId_idx" ON "MaintenanceJob"("propertyId");

-- CreateIndex
CREATE INDEX "MaintenanceJob_status_idx" ON "MaintenanceJob"("status");

-- CreateIndex
CREATE INDEX "MaintenanceJob_priority_idx" ON "MaintenanceJob"("priority");

-- CreateIndex
CREATE INDEX "MaintenanceJob_contractorId_idx" ON "MaintenanceJob"("contractorId");

-- CreateIndex
CREATE INDEX "MaintenanceJob_scheduledFor_idx" ON "MaintenanceJob"("scheduledFor");

-- CreateIndex
CREATE INDEX "MaintenanceJob_propertyId_status_idx" ON "MaintenanceJob"("propertyId", "status");

-- AddForeignKey
ALTER TABLE "MaintenanceJob" ADD CONSTRAINT "MaintenanceJob_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceJob" ADD CONSTRAINT "MaintenanceJob_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
