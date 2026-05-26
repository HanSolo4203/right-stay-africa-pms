-- CreateTable
CREATE TABLE "StatementBookingOverride" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "accommodation_total" DECIMAL(10,2),
    "discount" DECIMAL(10,2),
    "extra_charges" DECIMAL(10,2),
    "cleaning_fee" DECIMAL(10,2),
    "upsells" DECIMAL(10,2),
    "booking_taxes" DECIMAL(10,2),
    "channel_commission" DECIMAL(10,2),
    "total_management_fee" DECIMAL(10,2),
    "payment_processing_fee" DECIMAL(10,2),
    "total_payout" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatementBookingOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StatementBookingOverride_property_id_month_year_idx" ON "StatementBookingOverride"("property_id", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "StatementBookingOverride_booking_id_month_year_key" ON "StatementBookingOverride"("booking_id", "month", "year");

-- AddForeignKey
ALTER TABLE "StatementBookingOverride" ADD CONSTRAINT "StatementBookingOverride_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatementBookingOverride" ADD CONSTRAINT "StatementBookingOverride_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
