-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'PROPERTY_MANAGER', 'OWNER');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'HOUSE', 'STUDIO', 'TOWNHOUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ONBOARDING');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('AIRBNB', 'BOOKING_COM', 'DIRECT', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReceiptCategory" AS ENUM ('MAINTENANCE', 'CLEANING', 'SUPPLIES', 'UTILITIES', 'RATES_TAXES', 'INSURANCE', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PROPERTY_MANAGER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "suburb" TEXT,
    "city" TEXT NOT NULL,
    "unit_number" TEXT,
    "building_name" TEXT,
    "type" "PropertyType" NOT NULL DEFAULT 'APARTMENT',
    "bedrooms" INTEGER NOT NULL DEFAULT 1,
    "bathrooms" INTEGER NOT NULL DEFAULT 1,
    "parking_bays" TEXT[],
    "status" "PropertyStatus" NOT NULL DEFAULT 'ONBOARDING',
    "cover_photo_url" TEXT,
    "uplisting_id" TEXT,
    "uplisting_slug" TEXT,
    "uplisting_raw" JSONB,
    "airbnb_listing_url" TEXT,
    "booking_com_listing_url" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Owner" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "id_number" TEXT,
    "bank_name" TEXT,
    "account_number" TEXT,
    "branch_code" TEXT,
    "notes" TEXT,
    "portal_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "guest_name" TEXT NOT NULL,
    "guest_email" TEXT,
    "guest_phone" TEXT,
    "check_in" TIMESTAMP(3) NOT NULL,
    "check_out" TIMESTAMP(3) NOT NULL,
    "num_guests" INTEGER NOT NULL DEFAULT 1,
    "source" "BookingSource" NOT NULL DEFAULT 'DIRECT',
    "reference" TEXT,
    "nightly_rate" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "uplisting_id" TEXT,
    "uplisting_raw" JSONB,
    "last_synced_at" TIMESTAMP(3),
    "confirmation_code" TEXT,
    "channel_name" TEXT,
    "accommodation_total" DECIMAL(10,2),
    "cleaning_fee" DECIMAL(10,2),
    "commission" DECIMAL(10,2),
    "total_management_fee" DECIMAL(10,2),
    "gross_revenue" DECIMAL(10,2),
    "net_revenue" DECIMAL(10,2),
    "total_payout" DECIMAL(10,2),
    "csv_imported_at" TIMESTAMP(3),
    "csv_row_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CsvImportLog" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "new_records" INTEGER NOT NULL DEFAULT 0,
    "updated_records" INTEGER NOT NULL DEFAULT 0,
    "skipped_records" INTEGER NOT NULL DEFAULT 0,
    "error_records" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "property_summary" JSONB NOT NULL DEFAULT '{}',
    "imported_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CsvImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Statement" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Statement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "supplier" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" "ReceiptCategory" NOT NULL DEFAULT 'OTHER',
    "file_url" TEXT,
    "file_name" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "caption" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "commission_rate" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfoGuide" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "wifi_name" TEXT,
    "wifi_password" TEXT,
    "parking_instructions" TEXT,
    "access_code" TEXT,
    "lockbox_code" TEXT,
    "electricity_notes" TEXT,
    "emergency_contacts" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfoGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UplistingPropertyCache" (
    "id" TEXT NOT NULL,
    "uplisting_id" TEXT NOT NULL,
    "name" TEXT,
    "nickname" TEXT,
    "property_type" TEXT,
    "maximum_capacity" INTEGER,
    "bedrooms_count" INTEGER,
    "bathrooms_count" INTEGER,
    "description" TEXT,
    "check_in_time" INTEGER,
    "check_out_time" INTEGER,
    "property_slug" TEXT,
    "currency" TEXT,
    "time_zone" TEXT,
    "raw_payload" JSONB NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UplistingPropertyCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UplistingBookingCache" (
    "id" TEXT NOT NULL,
    "uplisting_id" TEXT NOT NULL,
    "uplisting_property_id" TEXT,
    "check_in" TIMESTAMP(3),
    "check_out" TIMESTAMP(3),
    "guest_name" TEXT,
    "guest_email" TEXT,
    "guest_phone" TEXT,
    "source" TEXT,
    "status" TEXT,
    "total_price" TEXT,
    "currency" TEXT,
    "raw_payload" JSONB NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UplistingBookingCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UplistingSyncLog" (
    "id" TEXT NOT NULL,
    "sync_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "records_synced" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "UplistingSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Property_uplisting_id_key" ON "Property"("uplisting_id");

-- CreateIndex
CREATE UNIQUE INDEX "Owner_property_id_key" ON "Owner"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_uplisting_id_key" ON "Booking"("uplisting_id");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_confirmation_code_key" ON "Booking"("confirmation_code");

-- CreateIndex
CREATE INDEX "Contract_property_id_created_at_idx" ON "Contract"("property_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "Contract_property_id_is_current_idx" ON "Contract"("property_id", "is_current");

-- CreateIndex
CREATE UNIQUE INDEX "InfoGuide_property_id_key" ON "InfoGuide"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "UplistingPropertyCache_uplisting_id_key" ON "UplistingPropertyCache"("uplisting_id");

-- CreateIndex
CREATE UNIQUE INDEX "UplistingBookingCache_uplisting_id_key" ON "UplistingBookingCache"("uplisting_id");

-- CreateIndex
CREATE INDEX "UplistingBookingCache_uplisting_property_id_idx" ON "UplistingBookingCache"("uplisting_property_id");

-- CreateIndex
CREATE INDEX "UplistingBookingCache_check_in_check_out_idx" ON "UplistingBookingCache"("check_in", "check_out");

-- AddForeignKey
ALTER TABLE "Owner" ADD CONSTRAINT "Owner_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoGuide" ADD CONSTRAINT "InfoGuide_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

