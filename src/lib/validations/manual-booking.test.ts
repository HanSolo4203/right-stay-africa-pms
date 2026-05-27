import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { BookingSource, BookingStatus } from "@prisma/client"
import {
  createManualBookingSchema,
  nightlyRateFromStay,
  parseDateYyyyMmDd,
} from "./manual-booking"

const propertyId = "00000000-0000-4000-8000-000000000001"

describe("parseDateYyyyMmDd", () => {
  it("parses ISO dates at UTC noon", () => {
    const d = parseDateYyyyMmDd("2026-05-15")
    assert.ok(d)
    assert.equal(d!.toISOString(), "2026-05-15T12:00:00.000Z")
  })

  it("rejects invalid dates", () => {
    assert.equal(parseDateYyyyMmDd("2026-13-01"), null)
  })
})

describe("createManualBookingSchema", () => {
  it("accepts a minimal valid payload", () => {
    const result = createManualBookingSchema.safeParse({
      propertyId,
      guest_name: "Jane Guest",
      check_in: "2026-05-01",
      check_out: "2026-05-10",
      source: BookingSource.AIRBNB,
      status: BookingStatus.CONFIRMED,
      num_guests: 2,
      total_payout: 5000,
    })
    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.data.guest_name, "Jane Guest")
    assert.equal(result.data.num_guests, 2)
    assert.equal(result.data.total_payout, 5000)
    assert.equal(result.data.cleaning_fee, 0)
  })

  it("rejects check-out on or before check-in", () => {
    const result = createManualBookingSchema.safeParse({
      propertyId,
      guest_name: "Jane Guest",
      check_in: "2026-05-10",
      check_out: "2026-05-10",
    })
    assert.equal(result.success, false)
  })

  it("trims confirmation code and notes", () => {
    const result = createManualBookingSchema.safeParse({
      propertyId,
      guest_name: "Jane Guest",
      check_in: "2026-05-01",
      check_out: "2026-05-05",
      confirmation_code: "  ABC123  ",
      notes: "  late entry  ",
    })
    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.data.confirmation_code, "ABC123")
    assert.equal(result.data.notes, "late entry")
  })
})

describe("nightlyRateFromStay", () => {
  it("derives nightly rate from accommodation and nights", () => {
    const checkIn = parseDateYyyyMmDd("2026-05-01")!
    const checkOut = parseDateYyyyMmDd("2026-05-06")!
    assert.equal(nightlyRateFromStay(1000, checkIn, checkOut), 200)
  })

  it("returns 0 when nights or accommodation are zero", () => {
    const checkIn = parseDateYyyyMmDd("2026-05-01")!
    const checkOut = parseDateYyyyMmDd("2026-05-01")!
    assert.equal(nightlyRateFromStay(1000, checkIn, checkOut), 0)
  })
})
