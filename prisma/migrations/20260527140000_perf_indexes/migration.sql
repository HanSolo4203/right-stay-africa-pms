-- CreateIndex
CREATE INDEX "Booking_property_id_idx" ON "Booking"("property_id");

-- CreateIndex
CREATE INDEX "Booking_check_in_idx" ON "Booking"("check_in");

-- CreateIndex
CREATE INDEX "Booking_check_out_idx" ON "Booking"("check_out");

-- CreateIndex
CREATE INDEX "Booking_property_id_check_in_check_out_idx" ON "Booking"("property_id", "check_in", "check_out");

-- CreateIndex
CREATE INDEX "Property_client_id_idx" ON "Property"("client_id");

-- CreateIndex
CREATE INDEX "Client_status_idx" ON "Client"("status");
