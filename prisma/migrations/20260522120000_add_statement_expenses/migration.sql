-- AlterTable
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "bank_name" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "account_holder" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "account_number" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "branch_code" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "account_type" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "management_fee_type" TEXT NOT NULL DEFAULT 'percentage';

-- CreateTable
CREATE TABLE IF NOT EXISTS "StatementExpense" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatementExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StatementExpense_client_id_property_id_month_year_idx" ON "StatementExpense"("client_id", "property_id", "month", "year");

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "StatementExpense" ADD CONSTRAINT "StatementExpense_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "StatementExpense" ADD CONSTRAINT "StatementExpense_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
