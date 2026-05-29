-- Allow cleaning tasks without a booking (manual property cleans)
ALTER TABLE "CleaningTask" ALTER COLUMN "booking_id" DROP NOT NULL;
