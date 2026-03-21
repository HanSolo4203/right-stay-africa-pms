-- Add missing CSV fields to Booking for full owner statement display
ALTER TABLE "Booking" ADD COLUMN "discount" DECIMAL(10,2);
ALTER TABLE "Booking" ADD COLUMN "extra_guest_charge" DECIMAL(10,2);
ALTER TABLE "Booking" ADD COLUMN "extra_charges" DECIMAL(10,2);
ALTER TABLE "Booking" ADD COLUMN "upsells" DECIMAL(10,2);
ALTER TABLE "Booking" ADD COLUMN "booking_taxes" DECIMAL(10,2);
ALTER TABLE "Booking" ADD COLUMN "commission_tax" DECIMAL(10,2);
ALTER TABLE "Booking" ADD COLUMN "payment_processing_fee" DECIMAL(10,2);
