-- AlterTable
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cleaning_schedule_locked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CleaningTask" ADD COLUMN IF NOT EXISTS "is_manual_override" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PropertyCleaningMonthRecord" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "task_count" INTEGER NOT NULL DEFAULT 0,
    "completed_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "snapshot" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyCleaningMonthRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PropertyCleaningMonthRecord_property_id_month_year_key" ON "PropertyCleaningMonthRecord"("property_id", "month", "year");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PropertyCleaningMonthRecord_property_id_year_month_idx" ON "PropertyCleaningMonthRecord"("property_id", "year", "month");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PropertyCleaningMonthRecord" ADD CONSTRAINT "PropertyCleaningMonthRecord_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
