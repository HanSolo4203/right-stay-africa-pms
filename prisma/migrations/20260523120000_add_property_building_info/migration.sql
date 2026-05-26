-- AlterTable
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "building_manager_email" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "building_manager_phone" TEXT;
